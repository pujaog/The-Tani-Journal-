import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { StorySearch } from '@/components/story-search'

export const dynamic = 'force-dynamic'

export default async function StoriesPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const query = searchParams.q?.trim() || ''
  const page = Math.max(Number(searchParams.page || 1), 1)
  const limit = 12
  const where = { status: 'PUBLISHED' as const, ...(query ? { OR: [{ title: { contains: query, mode: 'insensitive' as const } }, { excerpt: { contains: query, mode: 'insensitive' as const } }, { tags: { has: query.toLowerCase() } }] } : {}) }
  const [posts, total] = await Promise.all([prisma.post.findMany({ where, include: { author: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }), prisma.post.count({ where })])
  const pages = Math.ceil(total / limit)
  return <main className="min-h-screen bg-[#f4f0e8] px-5 py-10 text-stone-900 sm:py-16"><div className="mx-auto max-w-6xl"><header className="flex flex-wrap items-end justify-between gap-6 border-b border-stone-300 pb-8"><div><Link href="/" className="text-sm text-stone-500">The Tani Journal</Link><h1 className="mt-5 font-serif text-6xl">Stories</h1><p className="mt-3 text-stone-500">Reporting, reflection, and the details worth keeping.</p></div><StorySearch /></header><section className="mt-10 grid gap-px border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-3">{posts.map((post) => <Link key={post.id} href={`/stories/${post.slug}`} className="bg-[#f4f0e8] p-6 transition-colors hover:bg-white"><p className="text-xs uppercase tracking-[0.18em] text-stone-500">{post.author?.name || 'The Tani Journal'}</p><h2 className="mt-10 font-serif text-3xl leading-tight">{post.title}</h2><p className="mt-4 line-clamp-3 text-sm leading-relaxed text-stone-600">{post.excerpt}</p><p className="mt-8 text-xs text-stone-500">{post.likeCount} likes · {post.commentCount} comments · {post.viewCount} views</p></Link>)}{posts.length === 0 && <p className="col-span-full bg-[#f4f0e8] p-12 text-center text-stone-500">No stories matched that search.</p>}</section>{pages > 1 && <nav className="mt-8 flex justify-center gap-3 text-sm">{page > 1 && <Link href={`/stories?${query ? `q=${encodeURIComponent(query)}&` : ''}page=${page - 1}`} className="underline">Previous</Link>}<span className="text-stone-500">Page {page} of {pages}</span>{page < pages && <Link href={`/stories?${query ? `q=${encodeURIComponent(query)}&` : ''}page=${page + 1}`} className="underline">Next</Link>}</nav>}</div></main>
}