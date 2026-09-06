'use client'

import { useEffect } from 'react'
import { PostActions } from '@/components/post-actions'

type ArticleViewProps = { post: { id: string; likeCount: number; commentCount: number; viewCount: number; title: string; excerpt: string; content: string; author: { name: string | null } | null } }

export function ArticleView({ post }: ArticleViewProps) {
  useEffect(() => { fetch(`/api/posts/${post.id}/view`, { method: 'POST' }).catch(() => {}) }, [post.id])
  return <article><header className="mx-auto max-w-3xl"><p className="text-xs uppercase tracking-[0.25em] text-stone-500">The Tani Journal</p><h1 className="mt-5 font-serif text-5xl leading-tight sm:text-7xl">{post.title}</h1><p className="mt-6 text-xl leading-relaxed text-stone-600">{post.excerpt}</p><div className="mt-7 flex items-center justify-between border-y border-stone-200 py-4"><p className="text-sm text-stone-500">By {post.author?.name || 'The Tani Journal'} · {post.viewCount} views</p><PostActions postId={post.id} likeCount={post.likeCount} commentCount={post.commentCount} /></div></header><div className="prose prose-stone mx-auto mt-12 max-w-3xl" dangerouslySetInnerHTML={{ __html: post.content }} /></article>
}