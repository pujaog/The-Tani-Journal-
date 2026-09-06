'use client'

import { Search } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export function StorySearch() {
  const params = useSearchParams()
  const router = useRouter()
  const [query, setQuery] = useState(params.get('q') || '')
  return <form onSubmit={(event) => { event.preventDefault(); const value = query.trim(); router.push(value ? `/stories?q=${encodeURIComponent(value)}` : '/stories') }} className="flex max-w-md items-center border-b border-stone-300"><Search className="h-4 w-4 text-stone-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stories" className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-stone-400" aria-label="Search stories" /></form>
}