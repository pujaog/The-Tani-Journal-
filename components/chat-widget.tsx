'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'
import { io, type Socket } from 'socket.io-client'

type ChatMessage = { id: string; body: string; authorName: string; createdAt: string }

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [unread, setUnread] = useState(0)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const socket: Socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000')
    socket.on('chat:message', (message: ChatMessage) => {
      setMessages((current) => [...current.slice(-49), message])
      if (!open) setUnread((value) => value + 1)
    })
    return () => { socket.disconnect() }
  }, [open])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, open])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000')
    if (body.trim()) socket.emit('chat:send', { body: body.trim(), authorName: 'Guest' })
    setBody('')
    window.setTimeout(() => socket.disconnect(), 500)
  }

  return (
    <aside className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && <div className="flex h-[min(28rem,70vh)] w-[min(22rem,calc(100vw-2rem))] flex-col border border-stone-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <strong>Town square</strong><button onClick={() => setOpen(false)} aria-label="Close chat"><X className="h-4 w-4" /></button>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">{messages.map((message) => <p key={message.id}><b>{message.authorName}</b> {message.body}</p>)}<div ref={endRef} /></div>
        <form onSubmit={submit} className="flex gap-2 border-t border-stone-100 p-3"><input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Say hello" className="min-w-0 flex-1 border border-stone-200 px-3 py-2 text-sm" /><button aria-label="Send message" className="bg-stone-900 px-3 text-white"><Send className="h-4 w-4" /></button></form>
      </div>}
      <button onClick={() => { setOpen(!open); setUnread(0) }} className="relative flex h-14 w-14 items-center justify-center rounded-full bg-stone-900 text-white shadow-lg" aria-label={open ? 'Close chat' : 'Open chat'}><MessageCircle className="h-5 w-5" />{unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-rose-600 px-2 py-0.5 text-xs">{unread}</span>}</button>
    </aside>
  )
}