'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Editor } from '@/components/editor'

export default function WritePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(status: 'draft' | 'published') {
    setSaving(true); setError('')
    const response = await fetch('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, excerpt, content, tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean), status }) })
    if (!response.ok) setError((await response.json()).error || 'Could not save this piece.')
    else router.push('/')
    setSaving(false)
  }

  return <main className="min-h-screen bg-[#f4f0e8] px-5 py-8 text-stone-900"><div className="mx-auto max-w-5xl"><header className="mb-10 flex items-center justify-between"><Link href="/" className="font-serif text-xl">The Tani Journal</Link><Link href="/" className="text-sm text-stone-500">Leave editor</Link></header><div className="mb-8 grid gap-4 md:grid-cols-[1fr_18rem]"><div><label className="sr-only" htmlFor="title">Title</label><input id="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Untitled story" className="w-full bg-transparent font-serif text-5xl outline-none placeholder:text-stone-300" /><input value={excerpt} onChange={(event) => setExcerpt(event.target.value)} placeholder="A short deck or standfirst" className="mt-5 w-full border-b border-stone-300 bg-transparent pb-3 text-lg outline-none placeholder:text-stone-400" /></div><div className="self-end"><label className="text-xs uppercase tracking-[0.2em] text-stone-500">Tags</label><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="culture, place, memory" className="mt-2 w-full border border-stone-200 bg-white px-3 py-3 text-sm outline-none" /></div></div><Editor onChange={setContent} /><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-rose-600">{error}</p><div className="flex gap-3"><button disabled={saving || !title || !content} onClick={() => save('draft')} className="border border-stone-300 px-5 py-3 text-sm disabled:opacity-40">Save draft</button><button disabled={saving || !title || !content} onClick={() => save('published')} className="bg-stone-900 px-5 py-3 text-sm text-white disabled:opacity-40">{saving ? 'Saving...' : 'Publish story'}</button></div></div></div></main>
}