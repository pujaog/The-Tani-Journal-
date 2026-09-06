import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createPost, findOrCreateFolder } from '@/lib/drive'
import { decrypt } from '@/lib/crypto'

const postSchema = z.object({ title: z.string().trim().min(1).max(180), excerpt: z.string().max(500).default(''), content: z.string().min(1), tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]), status: z.enum(['draft', 'published']).default('draft') })

function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'untitled' }

export async function GET(request: Request) {
  const url = new URL(request.url)
  const page = Math.max(Number(url.searchParams.get('page') || 1), 1)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 12), 1), 50)
  const query = url.searchParams.get('q')?.trim()
  const where = { status: 'PUBLISHED' as const, ...(query ? { OR: [{ title: { contains: query, mode: 'insensitive' as const } }, { excerpt: { contains: query, mode: 'insensitive' as const } }] } : {}) }
  const [posts, total] = await Promise.all([prisma.post.findMany({ where, include: { author: { select: { id: true, name: true, image: true } }, }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }), prisma.post.count({ where })])
  return NextResponse.json({ posts, page, limit, total, pages: Math.ceil(total / limit) })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  const parsed = postSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'The post content is invalid.' }, { status: 400 })
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  const authData = user?.encryptedDriveAuth as { accessToken?: string } | null
  if (!user || !authData?.accessToken) return NextResponse.json({ error: 'Connect Google Drive before saving posts.' }, { status: 400 })
  const folderId = user.driveFolderId || await findOrCreateFolder(decrypt(authData.accessToken))
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const drivePost = { id, ...parsed.data, authorId: user.id, createdAt: now, updatedAt: now }
  const driveFile = await createPost(decrypt(authData.accessToken), folderId, drivePost)
  const post = await prisma.post.create({ data: { id, title: parsed.data.title, slug: `${slugify(parsed.data.title)}-${id.slice(0, 8)}`, excerpt: parsed.data.excerpt, tags: parsed.data.tags, status: parsed.data.status === 'published' ? 'PUBLISHED' : 'DRAFT', authorId: user.id, driveFileId: driveFile.id }, })
  if (!user.driveFolderId) await prisma.user.update({ where: { id: user.id }, data: { driveFolderId: folderId } })
  return NextResponse.json({ post }, { status: 201 })
}