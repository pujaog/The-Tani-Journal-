import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { readPost } from '@/lib/drive'
import { ArticleView } from '@/components/article-view'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await prisma.post.findUnique({ where: { slug: params.slug }, select: { title: true, excerpt: true } })
  return { title: post ? `${post.title} | The Tani Journal` : 'Story | The Tani Journal', description: post?.excerpt }
}

export default async function StoryPage({ params }: { params: { slug: string } }) {
  const post = await prisma.post.findUnique({ where: { slug: params.slug }, include: { author: { select: { name: true, encryptedDriveAuth: true } } } })
  if (!post || post.status !== 'PUBLISHED') notFound()
  const encrypted = post.author.encryptedDriveAuth as { accessToken?: string } | null
  if (!encrypted?.accessToken) notFound()
  const drivePost = await readPost(decrypt(encrypted.accessToken), post.driveFileId)
  return <main className="min-h-screen bg-[#f4f0e8] px-5 py-10 text-stone-900 sm:py-16"><div className="mx-auto max-w-6xl"><Link href="/stories" className="text-sm text-stone-500">← Back to stories</Link><div className="mt-14"><ArticleView post={{ ...post, content: drivePost.content, author: post.author }} /></div></div></main>
}