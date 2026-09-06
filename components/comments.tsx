'use client'

import { useEffect, useMemo, useState } from 'react'
import { MessageCircle, Reply, Send } from 'lucide-react'
import { soundManager } from '@/lib/sound-manager'

type CommentItem = { id: string; body: string; parentId: string | null; createdAt: string; author: { id: string; name: string | null; image: string | null } }

export function Comments({ postId }: { postId: string }) {
  const [comments, setComments] = useState<CommentItem[]>([])
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function load() {
    const response = await fetch(`/api/posts/${postId}/comments`)
    if (response.ok) setComments((await response.json()).comments)
  }
  useEffect(() => { load().catch(() => setError('Comments are temporarily unavailable.')) }, [postId])

  const tree = useMemo(() => comments.filter((comment) => !comment.parentId).map((comment) => ({ comment, replies: comments.filter((reply) => reply.parentId === comment.id) })), [comments])
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!body.trim()) return
    setSending(true); setError('')
    const response = await fetch(`/api/posts/${postId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body, parentId: replyTo }) })
    if (!response.ok) setError((await response.json()).error || 'Sign in to join the conversation.')
    else { setBody(''); setReplyTo(null); soundManager.play('commentSubmit'); await load() }
    setSending(false)
  }

  return <section id="comments" className="mx-auto mt-20 max-w-3xl border-t border-stone-200 pt-8"><div className="flex items-center gap-2"><MessageCircle className="h-5 w-5" /><h2 className="font-serif text-3xl">Conversation</h2></div><form onSubmit={submit} className="mt-6 flex gap-2 border border-stone-200 bg-white p-2"><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder={replyTo ? 'Write a reply...' : 'Add a thoughtful note...'} rows={2} className="min-w-0 flex-1 resize-none px-2 py-1 text-sm outline-none" /><button disabled={sending} aria-label="Submit comment" className="self-end bg-stone-900 p-3 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button></form>{replyTo && <button onClick={() => setReplyTo(null)} className="mt-2 text-xs text-stone-500 underline">Cancel reply</button>}{error && <p className="mt-3 text-sm text-rose-600">{error}</p>}<div className="mt-8 space-y-7">{tree.map(({ comment, replies }) => <div key={comment.id}><p className="text-sm leading-relaxed"><strong>{comment.author.name || 'Reader'}</strong> <span className="text-stone-500">{comment.body}</span></p><button onClick={() => setReplyTo(comment.id)} className="mt-2 inline-flex items-center gap-1 text-xs text-stone-500"><Reply className="h-3 w-3" /> Reply</button>{replies.length > 0 && <div className="ml-5 mt-4 space-y-4 border-l border-stone-200 pl-4">{replies.map((reply) => <p key={reply.id} className="text-sm leading-relaxed"><strong>{reply.author.name || 'Reader'}</strong> <span className="text-stone-500">{reply.body}</span></p>)}</div>}</div>)}</div></section>
}