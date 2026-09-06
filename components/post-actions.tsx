'use client'

import { useState } from 'react'
import { Check, Heart, Link2, MessageCircle, Share2 } from 'lucide-react'
import { soundManager } from '@/lib/sound-manager'

type PostActionsProps = { postId: string; likeCount: number; commentCount: number; liked?: boolean }

export function PostActions({ postId, likeCount, commentCount, liked = false }: PostActionsProps) {
  const [isLiked, setIsLiked] = useState(liked)
  const [likes, setLikes] = useState(likeCount)
  const [copied, setCopied] = useState(false)

  async function toggleLike() {
    const next = !isLiked
    setIsLiked(next)
    setLikes((value) => value + (next ? 1 : -1))
    soundManager.play('likeTap')
    const response = await fetch(`/api/posts/${postId}/like`, { method: 'POST' })
    if (!response.ok) {
      setIsLiked(!next)
      setLikes((value) => value + (next ? -1 : 1))
    }
  }

  async function share() {
    const url = window.location.href
    if (navigator.share) await navigator.share({ title: document.title, url })
    else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <div className="flex items-center gap-5 text-sm text-stone-500">
      <button type="button" onClick={toggleLike} className={isLiked ? 'text-rose-600' : ''} aria-label="Like article">
        <Heart className="mr-1 inline h-4 w-4" fill={isLiked ? 'currentColor' : 'none'} /> {likes}
      </button>
      <a href="#comments" aria-label="Jump to comments"><MessageCircle className="mr-1 inline h-4 w-4" /> {commentCount}</a>
      <button type="button" onClick={share} aria-label="Share article">
        {copied ? <Check className="mr-1 inline h-4 w-4" /> : <Share2 className="mr-1 inline h-4 w-4" />} {copied ? 'Copied' : 'Share'}
      </button>
      <Link2 className="hidden h-4 w-4 sm:block" aria-hidden="true" />
    </div>
  )
}