import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { deletePost, readPost, updatePost } from '@/lib/drive'

const updateSchema = z.object({ title: z.string().trim().min(1).max(180), excerpt: z.string().max(500), content: z.string().min(1), tags: z.array(z.string()).max(12), status: z.enum(['draft', 'published']) })

export async function GET(_request: Request, context: { params: { id: string } }) {
  const post = await prisma.post.findFirst({ where: { OR: [{ id: context.params.id }, { slug: context.params.id }], status: 'PUBLISHED' }, include: { author: { select: { id: true, name: true, image: true } } } })
  if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 })
  return NextResponse.json({ post })
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  const post = await prisma.post.findUnique({ where: { id: context.params.id } })
  if (!parsed.success || !post || post.authorId !== session.user.id) return NextResponse.json({ error: 'Invalid post update.' }, { status: 400 })
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  const encrypted = user?.encryptedDriveAuth as { accessToken?: string } | null
  if (!user?.driveFolderId || !encrypted?.accessToken) return NextResponse.json({ error: 'Drive is not connected.' }, { status: 400 })
  const token = decrypt(encrypted.accessToken)
  const updated = { id: post.id, ...parsed.data, authorId: user.id, createdAt: post.createdAt.toISOString(), updatedAt: new Date().toISOString() }
  await updatePost(token, user.driveFolderId, updated, post.driveFileId)
  const saved = await prisma.post.update({ where: { id: post.id }, data: { title: parsed.data.title, excerpt: parsed.data.excerpt, tags: parsed.data.tags, status: parsed.data.status === 'published' ? 'PUBLISHED' : 'DRAFT' } })
  return NextResponse.json({ post: saved })
}

export async function DELETE(_request: Request, context: { params: { id: string } }) {
  const session = await auth()
  const post = session?.user?.id ? await prisma.post.findUnique({ where: { id: context.params.id } }) : null
  if (!post || post.authorId !== session?.user?.id) return NextResponse.json({ error: 'Post not found.' }, { status: 404 })
  const user = await prisma.user.findUnique({ where: { id: post.authorId } })
  const encrypted = user?.encryptedDriveAuth as { accessToken?: string } | null
  if (encrypted?.accessToken) await deletePost(decrypt(encrypted.accessToken), post.driveFileId)
  await prisma.post.delete({ where: { id: post.id } })
  return NextResponse.json({ deleted: true })
}