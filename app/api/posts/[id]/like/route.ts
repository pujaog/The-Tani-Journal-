import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(_request: Request, context: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  const userId = session.user.id
  const post = await prisma.post.findUnique({ where: { id: context.params.id }, select: { id: true } })
  if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 })
  const existing = await prisma.like.findUnique({ where: { userId_postId: { userId, postId: post.id } } })
  const liked = !existing
  await prisma.$transaction(async (transaction) => {
    if (existing) await transaction.like.delete({ where: { userId_postId: { userId, postId: post.id } } })
    else await transaction.like.create({ data: { userId, postId: post.id } })
    await transaction.post.update({ where: { id: post.id }, data: { likeCount: { increment: liked ? 1 : -1 } } })
  })
  const updated = await prisma.post.findUnique({ where: { id: post.id }, select: { likeCount: true } })
  return NextResponse.json({ liked, likeCount: updated?.likeCount || 0 })
}