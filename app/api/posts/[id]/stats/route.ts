import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_request: Request, context: { params: { id: string } }) {
  const post = await prisma.post.findUnique({ where: { id: context.params.id }, select: { likeCount: true, commentCount: true, viewCount: true } })
  if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 })
  return NextResponse.json({ stats: post })
}