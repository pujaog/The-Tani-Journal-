import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function AuthorPage({ params }: { params: { id: string } }) {
  const author = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, name: true, image: true, createdAt: true, posts: { where: { status: 'PUBLISHED' }, orderBy: { createdAt: 'desc' }, select: { slug: true, title: true, excerpt: true, createdAt: true, viewCount: true, likeCount: true } } } })
  if (!author) notFound()
  return <main className="min-h-screen bg-[#f4f0e8] px-5 py-10 text-stone-900 sm:py-16"><div className="mx-auto max-w-5xl"><Link href="/stories" className="text-sm text-stone-500">← Stories</Link><header className="mt-16 border-b border-stone-300 pb-10"><div className="flex items-center gap-5">{author.image ? <img src={author.image} alt="" className="h-16 w-16 rounded-full object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-200 font-serif text-2xl">{(author.name || 'A')[0]}</div>}<div><p className="text-xs uppercase tracking-[0.25em] text-stone-500">Author</p><h1 className="mt-2 font-serif text-5xl">{author.name || 'The Tani Journal writer'}</h1></div></div><p className="mt-5 text-sm text-stone-500">{author.posts.length} published {author.posts.length === 1 ? 'story' : 'stories'}</p></header><section className="mt-10 space-y-4">{author.posts.map((post) => <Link key={post.slug} href={`/stories/${post.slug}`} className="block border-b border-stone-200 py-6 transition-colors hover:bg-white"><h2 className="font-serif text-3xl">{post.title}</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">{post.excerpt}</p><p className="mt-4 text-xs text-stone-500">{post.likeCount} likes · {post.viewCount} views</p></Link>)}{author.posts.length === 0 && <p className="text-stone-500">No published stories yet.</p>}</section></div></main>
}