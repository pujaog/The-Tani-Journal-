import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, context: { params: { id: string } }) {
  const post = await prisma.post.findUnique({ where: { id: context.params.id }, select: { id: true } })
  if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 })
  const session = await auth()
  const forwarded = request.headers.get('x-forwarded-for') || 'anonymous'
  const viewerKey = session?.user?.id || createHash('sha256').update(forwarded.split(',')[0].trim()).digest('hex')
  const existing = await prisma.postView.findUnique({ where: { postId_viewerKey: { postId: post.id, viewerKey } } })
  const stale = !existing || Date.now() - existing.viewedAt.getTime() >= 24 * 60 * 60 * 1000
  if (stale) {
    await prisma.$transaction(async (transaction) => {
      await transaction.postView.upsert({ where: { postId_viewerKey: { postId: post.id, viewerKey } }, create: { postId: post.id, viewerKey }, update: { viewedAt: new Date() } })
      if (stale) await transaction.post.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } })
    })
  }
  const updated = await prisma.post.findUnique({ where: { id: post.id }, select: { viewCount: true } })
  return NextResponse.json({ counted: stale, viewCount: updated?.viewCount || 0 })
}