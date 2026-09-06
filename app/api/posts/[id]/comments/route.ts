import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const schema = z.object({ body: z.string().trim().min(1).max(4000), parentId: z.string().cuid().nullable().optional() })

export async function GET(_request: Request, context: { params: { id: string } }) {
  const comments = await prisma.comment.findMany({ where: { postId: context.params.id }, include: { author: { select: { id: true, name: true, image: true } } }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ comments })
}

export async function POST(request: Request, context: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  const userId = session.user.id
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Comment cannot be empty.' }, { status: 400 })
  const post = await prisma.post.findUnique({ where: { id: context.params.id }, select: { id: true } })
  if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 })
  if (parsed.data.parentId) {
    const parent = await prisma.comment.findFirst({ where: { id: parsed.data.parentId, postId: post.id } })
    if (!parent) return NextResponse.json({ error: 'Reply target not found.' }, { status: 400 })
  }
  const comment = await prisma.$transaction(async (transaction) => {
    const created = await transaction.comment.create({ data: { body: parsed.data.body, parentId: parsed.data.parentId || null, authorId: userId, postId: post.id }, include: { author: { select: { id: true, name: true, image: true } } } })
    await transaction.post.update({ where: { id: post.id }, data: { commentCount: { increment: 1 } } })
    return created
  })
  return NextResponse.json({ comment }, { status: 201 })
}