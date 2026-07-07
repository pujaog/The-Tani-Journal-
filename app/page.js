'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen, Plus, Image as ImageIcon, X, Pencil, Trash2, Type, Palette,
  Calendar, Heart, ChevronDown, Sparkles, Feather, Coffee, Moon,
  Sun, Trees, Loader2, Check, Users, Lock, Globe, LogOut, User as UserIcon,
  Mail, KeyRound, ArrowRight
} from 'lucide-react'
import {
  auth, onAuthStateChanged, signInWithGoogle, signInEmail, signUpEmail, signOut, authedFetch,
  completeRedirectSignIn
} from '@/lib/firebase'

const THEMES = [
  { id: 'paper',    name: 'Paper',    icon: Sun,   swatch: 'linear-gradient(135deg, #faf7f2 0%, #efe8d8 100%)' },
  { id: 'midnight', name: 'Midnight', icon: Moon,  swatch: 'linear-gradient(135deg, #1a1b2e 0%, #06060d 100%)' },
  { id: 'sepia',    name: 'Sepia',    icon: Coffee, swatch: 'linear-gradient(135deg, #f4ecd8 0%, #d9c9a3 100%)' },
  { id: 'forest',   name: 'Forest',   icon: Trees, swatch: 'linear-gradient(135deg, #0f2620 0%, #1a4033 100%)' },
]

const FONTS = [
  { id: 'serif',   name: 'Fraunces',   preview: 'Aa', desc: 'Warm serif' },
  { id: 'sans',    name: 'Inter',      preview: 'Aa', desc: 'Modern sans' },
  { id: 'display', name: 'Playfair',   preview: 'Aa', desc: 'Editorial' },
  { id: 'mono',    name: 'JetBrains',  preview: 'Aa', desc: 'Monospace' },
]

const MOODS = ['✨ Reflective', '🌊 Calm', '🔥 Alive', '🌧️ Melancholy', '☀️ Grateful', '💭 Curious', '🌙 Quiet']

const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1586380951230-e6703d9f6833',
  'https://images.pexels.com/photos/20035788/pexels-photo-20035788.jpeg',
  'https://images.unsplash.com/photo-1600818797017-d6e5027210bb',
  'https://images.unsplash.com/photo-1534040385115-33dcb3acba5b',
  'https://images.unsplash.com/photo-1542452221-97f8f101b283',
  'https://images.pexels.com/photos/33175914/pexels-photo-33175914.jpeg',
]

function formatDate(iso) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
  const same = (a, b) => a.toDateString() === b.toDateString()
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (same(d, today)) return `Today · ${time}`
  if (same(d, yesterday)) return `Yesterday · ${time}`
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

function groupByDate(list) {
  const groups = {}
  for (const p of list) {
    const d = new Date(p.createdAt)
    const key = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(p)
  }
  return groups
}

function Avatar({ url, name, size = 32 }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase()
  if (url) {
    return <img src={url} alt="" style={{ width: size, height: size }} className="rounded-full object-cover flex-shrink-0" />
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      className="rounded-full flex items-center justify-center font-semibold flex-shrink-0"
      // eslint-disable-next-line react/forbid-dom-props
    >
      <div style={{ width: size, height: size, background: 'currentColor', opacity: 0.15, borderRadius: '9999px', position: 'absolute' }} />
      <span style={{ position: 'relative' }}>{initial}</span>
    </div>
  )
}

// ---------- Sign In Screen ----------
function SignInScreen() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const google = async () => {
    setErr(''); setBusy(true)
    try { await signInWithGoogle() }
    catch (e) { setErr(e?.message || 'Google sign-in failed') }
    finally { setBusy(false) }
  }

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      if (mode === 'signin') await signInEmail(email, password)
      else await signUpEmail(email, password, displayName || email.split('@')[0])
    } catch (e) {
      setErr(e?.message?.replace('Firebase: ', '') || 'Authentication failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'currentColor' }}>
            <BookOpen className="w-6 h-6" style={{ color: 'var(--bg-invert, #fff)', mixBlendMode: 'difference' }} />
          </div>
          <h1 className="text-4xl font-semibold mb-2" style={{ fontFamily: 'Fraunces, serif' }}>The Tani Journal</h1>
          <p className="journal-muted text-sm">Your story, beautifully kept.</p>
        </div>

        <div className="journal-card border rounded-2xl p-6 sm:p-8">
          <div className="flex gap-1 p-1 rounded-lg mb-6" style={{ background: 'rgba(128,128,128,0.08)' }}>
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 text-sm rounded-md transition ${mode === 'signin' ? 'journal-chip-active' : ''}`}
            >Sign in</button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 text-sm rounded-md transition ${mode === 'signup' ? 'journal-chip-active' : ''}`}
            >Create account</button>
          </div>

          <button
            onClick={google}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border font-medium text-sm mb-5 hover:bg-white/5 transition disabled:opacity-50"
            style={{ borderColor: 'rgba(128,128,128,0.25)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px journal-divider" />
            <span className="text-xs journal-muted">or with email</span>
            <div className="flex-1 h-px journal-divider" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 journal-muted" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  className="journal-input w-full pl-10 pr-3 py-3 rounded-xl text-sm"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 journal-muted" />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="journal-input w-full pl-10 pr-3 py-3 rounded-xl text-sm"
              />
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 journal-muted" />
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 chars)"
                className="journal-input w-full pl-10 pr-3 py-3 rounded-xl text-sm"
              />
            </div>

            {err && <div className="text-xs text-red-500 px-1">{err}</div>}

            <button
              type="submit"
              disabled={busy}
              className="journal-btn-primary w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs journal-muted mt-6">
          A quiet place to keep your moments — privately, or shared with friends.
        </p>
      </div>
    </div>
  )
}

// ---------- Post Editor ----------
function PostEditor({ open, onClose, onSave, initial }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mood, setMood] = useState('')
  const [images, setImages] = useState([])
  const [visibility, setVisibility] = useState('private')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (open) {
      setTitle(initial?.title || '')
      setContent(initial?.content || '')
      setMood(initial?.mood || '')
      setImages(initial?.images || [])
      setVisibility(initial?.visibility || 'private')
    }
  }, [open, initial])

  const handleFile = async (e) => {
    const files = Array.from(e.target.files || [])
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue
      const dataUrl = await new Promise((res) => {
        const r = new FileReader()
        r.onload = () => res(r.result)
        r.readAsDataURL(f)
      })
      setImages(prev => [...prev, { url: dataUrl, aspectRatio: '16:9' }].slice(0, 6))
    }
    e.target.value = ''
  }
  const addSample = (url) => setImages(prev => [...prev, { url, aspectRatio: '16:9' }].slice(0, 6))
  const setRatio = (i, ratio) => setImages(prev => prev.map((im, idx) => idx === i ? { ...im, aspectRatio: ratio } : im))
  const removeImg = (i) => setImages(prev => prev.filter((_, idx) => idx !== i))

  const submit = async () => {
    if (!title.trim() && !content.trim() && images.length === 0) return
    setSaving(true)
    try {
      await onSave({ title: title.trim() || 'Untitled Entry', content, mood, images, visibility })
      onClose()
    } finally { setSaving(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-0 sm:p-6 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}>
      <div className="journal-card w-full max-w-3xl rounded-none sm:rounded-2xl border my-0 sm:my-8 fade-up">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'inherit' }}>
          <div className="flex items-center gap-2">
            <Feather className="w-4 h-4" />
            <span className="text-sm font-medium tracking-wide">{initial ? 'Edit entry' : 'New journal entry'}</span>
          </div>
          <button onClick={onClose} className="journal-btn-ghost p-2 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-6 space-y-5">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give this moment a title…"
            className="journal-input w-full text-2xl sm:text-3xl font-semibold px-0 py-2 bg-transparent border-0 border-b rounded-none focus:outline-none"
            style={{ borderColor: 'transparent' }}
          />

          <div className="flex flex-wrap gap-2">
            {MOODS.map(m => (
              <button key={m} onClick={() => setMood(mood === m ? '' : m)}
                className={`px-3 py-1.5 rounded-full text-xs border ${mood === m ? 'journal-chip-active' : 'journal-chip'}`}>{m}</button>
            ))}
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What happened today? What did it feel like? Write freely…"
            rows={8}
            className="journal-input w-full text-base px-4 py-3 rounded-xl resize-none focus:outline-none"
          />

          {images.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {images.map((im, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(128,128,128,0.2)' }}>
                  <div className={im.aspectRatio === '3:4' ? 'aspect-3-4' : 'aspect-16-9'}>
                    <img src={im.url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button onClick={() => removeImg(i)} className="p-1.5 rounded-md bg-black/60 text-white hover:bg-black/80"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    <button onClick={() => setRatio(i, '16:9')} className={`px-2 py-1 text-[10px] rounded-md ${im.aspectRatio === '16:9' ? 'bg-white text-black' : 'bg-black/60 text-white'}`}>16:9</button>
                    <button onClick={() => setRatio(i, '3:4')} className={`px-2 py-1 text-[10px] rounded-md ${im.aspectRatio === '3:4' ? 'bg-white text-black' : 'bg-black/60 text-white'}`}>3:4</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFile} />
              <button onClick={() => fileRef.current?.click()} className="journal-chip inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs border">
                <ImageIcon className="w-3.5 h-3.5" /> Upload photos
              </button>
              <span className="text-xs journal-muted">or pick a sample →</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {SAMPLE_IMAGES.map(u => (
                <button key={u} onClick={() => addSample(u)} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border hover:scale-105 transition-transform" style={{ borderColor: 'rgba(128,128,128,0.25)' }}>
                  <img src={u} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Visibility toggle */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => setVisibility('private')}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${visibility === 'private' ? 'journal-chip-active' : 'journal-chip'}`}
            ><Lock className="w-3 h-3" /> Private · only me</button>
            <button
              onClick={() => setVisibility('public')}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${visibility === 'public' ? 'journal-chip-active' : 'journal-chip'}`}
            ><Globe className="w-3 h-3" /> Public · shared to community</button>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: 'inherit' }}>
          <span className="text-xs journal-muted">{content.length} chars · {images.length} media</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="journal-btn-ghost px-4 py-2 rounded-lg text-sm">Cancel</button>
            <button onClick={submit} disabled={saving} className="journal-btn-primary inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Saving…' : (initial ? 'Save changes' : 'Publish entry')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- Post Card ----------
function PostCard({ post, canEdit, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [liked, setLiked] = useState(false)
  const first = post.images?.[0]
  const rest = post.images?.slice(1) || []

  return (
    <article className="journal-card rounded-2xl border overflow-hidden fade-up">
      {first && (
        <div className={first.aspectRatio === '3:4' ? 'aspect-3-4' : 'aspect-16-9'}>
          <img src={first.url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-6 sm:p-7">
        {/* Author + date */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {post.author && (
              <div className="relative w-8 h-8">
                <Avatar url={post.author.photoURL} name={post.author.displayName} size={32} />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{post.author?.displayName || 'Someone'}</div>
              <div className="flex items-center gap-1.5 text-[11px] journal-muted">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(post.createdAt)}</span>
                {post.mood && (<><span>·</span><span>{post.mood}</span></>)}
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  {post.visibility === 'public' ? <><Globe className="w-2.5 h-2.5" /> Public</> : <><Lock className="w-2.5 h-2.5" /> Private</>}
                </span>
              </div>
            </div>
          </div>
          {canEdit && (
            <div className="relative">
              <button onClick={() => setMenuOpen(v => !v)} className="journal-btn-ghost p-2 rounded-lg"><ChevronDown className="w-4 h-4" /></button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border shadow-lg z-10 overflow-hidden" style={{ background: '#fff', borderColor: 'rgba(128,128,128,0.2)' }}>
                  <button onClick={() => { setMenuOpen(false); onEdit(post) }} className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 flex items-center gap-2" style={{ color: '#1a1a1a', background: '#fff' }}>
                    <Pencil className="w-3.5 h-3.5" /> Edit entry
                  </button>
                  <button onClick={() => { setMenuOpen(false); onDelete(post) }} className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2" style={{ background: '#fff' }}>
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <h2 className="text-2xl sm:text-3xl font-semibold leading-tight mb-3">{post.title}</h2>
        {post.content && <div className="journal-prose mt-2">{post.content}</div>}

        {rest.length > 0 && (
          <div className={`mt-5 grid gap-2 ${rest.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {rest.map((im, i) => (
              <div key={i} className={`rounded-lg overflow-hidden ${im.aspectRatio === '3:4' ? 'aspect-3-4' : 'aspect-16-9'}`}>
                <img src={im.url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3 text-xs journal-muted">
          <button onClick={() => setLiked(v => !v)} className="journal-btn-ghost inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg">
            <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
            <span>{liked ? '1' : '0'}</span>
          </button>
        </div>
      </div>
    </article>
  )
}

// ---------- Style Panel ----------
function StylePanel({ open, onClose, theme, setTheme, font, setFont }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div className="absolute right-4 top-16 w-80 journal-card border rounded-2xl p-5 fade-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4" />
          <h3 className="font-semibold text-sm">Style your journal</h3>
        </div>
        <div className="mb-5">
          <div className="text-xs journal-muted uppercase tracking-wider mb-2">Background</div>
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map(t => {
              const Icon = t.icon
              return (
                <button key={t.id} onClick={() => setTheme(t.id)}
                  className={`p-3 rounded-xl border text-left ${theme === t.id ? 'ring-2 ring-offset-2' : ''}`}
                  style={{ borderColor: theme === t.id ? 'currentColor' : 'rgba(128,128,128,0.2)' }}>
                  <div className="w-full h-8 rounded-md mb-2" style={{ background: t.swatch }} />
                  <div className="flex items-center gap-1.5"><Icon className="w-3 h-3" /><span className="text-xs font-medium">{t.name}</span></div>
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <div className="text-xs journal-muted uppercase tracking-wider mb-2">Typeface</div>
          <div className="grid grid-cols-2 gap-2">
            {FONTS.map(f => (
              <button key={f.id} onClick={() => setFont(f.id)}
                className={`p-3 rounded-xl border text-left ${font === f.id ? 'ring-2 ring-offset-2' : ''}`}
                style={{
                  borderColor: font === f.id ? 'currentColor' : 'rgba(128,128,128,0.2)',
                  fontFamily: f.id === 'serif' ? 'Fraunces, serif' : f.id === 'sans' ? 'Inter, sans-serif' : f.id === 'mono' ? 'JetBrains Mono, monospace' : 'Playfair Display, serif'
                }}>
                <div className="text-2xl leading-none mb-1">{f.preview}</div>
                <div className="text-[11px] font-medium">{f.name}</div>
                <div className="text-[10px] journal-muted">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- Profile Editor ----------
function ProfileEditor({ open, onClose, profile, onSave }) {
  const [displayName, setDisplayName] = useState('')
  const [photoURL, setPhotoURL] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (open && profile) {
      setDisplayName(profile.displayName || '')
      setPhotoURL(profile.photoURL || '')
      setBio(profile.bio || '')
    }
  }, [open, profile])

  const pickPhoto = async (e) => {
    const f = e.target.files?.[0]
    if (!f || !f.type.startsWith('image/')) return
    const dataUrl = await new Promise(res => {
      const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f)
    })
    setPhotoURL(dataUrl)
    e.target.value = ''
  }

  const submit = async () => {
    setSaving(true)
    try { await onSave({ displayName, photoURL, bio }); onClose() }
    finally { setSaving(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}>
      <div className="journal-card w-full max-w-md rounded-2xl border fade-up">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'inherit' }}>
          <span className="text-sm font-medium">Edit your profile</span>
          <button onClick={onClose} className="journal-btn-ghost p-2 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16">
              <Avatar url={photoURL} name={displayName || 'A'} size={64} />
            </div>
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
              <button onClick={() => fileRef.current?.click()} className="journal-chip inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border">
                <ImageIcon className="w-3.5 h-3.5" /> Change photo
              </button>
              {photoURL && (
                <button onClick={() => setPhotoURL('')} className="ml-2 text-xs journal-muted hover:underline">Remove</button>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs journal-muted uppercase tracking-wider block mb-1">Display name</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="journal-input w-full px-3 py-2 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs journal-muted uppercase tracking-wider block mb-1">Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={280} placeholder="A short something about you…" className="journal-input w-full px-3 py-2 rounded-lg text-sm resize-none" />
            <div className="text-[10px] journal-muted text-right mt-1">{bio.length}/280</div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: 'inherit' }}>
          <button onClick={onClose} className="journal-btn-ghost px-4 py-2 rounded-lg text-sm">Cancel</button>
          <button onClick={submit} disabled={saving} className="journal-btn-primary inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------- Main App ----------
function App() {
  const [authUser, setAuthUser] = useState(undefined) // undefined = loading; null = signed out
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('mine') // 'mine' | 'community'
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, setTheme] = useState('paper')
  const [font, setFont] = useState('serif')
  const [styleOpen, setStyleOpen] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem('tani-theme'); if (t) setTheme(t)
    const f = localStorage.getItem('tani-font');  if (f) setFont(f)
  }, [])
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('tani-theme', theme) }, [theme])
  useEffect(() => { document.documentElement.setAttribute('data-font', font);  localStorage.setItem('tani-font', font) }, [font])

  // Auth listener
  useEffect(() => {
    // Complete any pending Google redirect sign-in
    completeRedirectSignIn()
    const unsub = onAuthStateChanged(auth, async (u) => {
      setAuthUser(u || null)
      if (u) {
        try {
          const r = await authedFetch('/api/me')
          const j = await r.json()
          setProfile(j.profile || null)
        } catch (e) { console.error(e) }
      } else {
        setProfile(null); setPosts([])
      }
    })
    return () => unsub()
  }, [])

  const fetchPosts = async (which = tab) => {
    if (!authUser) return
    setLoading(true)
    try {
      const r = await authedFetch(`/api/posts?scope=${which}`)
      const j = await r.json()
      setPosts(j.posts || [])
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }
  useEffect(() => { if (authUser) fetchPosts(tab) /* eslint-disable-next-line */ }, [authUser, tab])

  const savePost = async (data) => {
    if (editing) {
      const r = await authedFetch(`/api/posts/${editing.id}`, { method: 'PUT', body: JSON.stringify(data) })
      const j = await r.json()
      if (j.post) fetchPosts(tab)
      setEditing(null)
    } else {
      const r = await authedFetch('/api/posts', { method: 'POST', body: JSON.stringify(data) })
      const j = await r.json()
      if (j.post) { setTab('mine'); fetchPosts('mine') }
    }
  }

  const deletePost = async (p) => {
    if (!confirm('Delete this entry? It cannot be undone.')) return
    await authedFetch(`/api/posts/${p.id}`, { method: 'DELETE' })
    setPosts(prev => prev.filter(x => x.id !== p.id))
  }

  const saveProfile = async (data) => {
    const r = await authedFetch('/api/me', { method: 'PATCH', body: JSON.stringify(data) })
    const j = await r.json()
    if (j.profile) setProfile(j.profile)
    fetchPosts(tab)
  }

  const groups = useMemo(() => groupByDate(posts), [posts])
  const groupKeys = Object.keys(groups)

  // Loading auth
  if (authUser === undefined) {
    return <div className="min-h-screen flex items-center justify-center journal-muted"><Loader2 className="w-5 h-5 animate-spin" /></div>
  }

  // Signed out
  if (!authUser) return <SignInScreen />

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md" style={{ background: 'color-mix(in srgb, currentColor 4%, transparent)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'currentColor' }}>
              <BookOpen className="w-4 h-4" style={{ color: 'var(--bg-invert, #fff)', mixBlendMode: 'difference' }} />
            </div>
            <div>
              <div className="text-base font-semibold leading-tight" style={{ fontFamily: 'Fraunces, serif' }}>The Tani Journal</div>
              <div className="text-[11px] journal-muted leading-tight">Your story, beautifully kept</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setStyleOpen(true)} className="journal-btn-ghost inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs">
              <Palette className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Style</span>
            </button>
            <button onClick={() => { setEditing(null); setEditorOpen(true) }} className="journal-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium">
              <Plus className="w-3.5 h-3.5" /> New entry
            </button>
            <div className="relative">
              <button onClick={() => setMenuOpen(v => !v)} className="ml-1 relative flex-shrink-0">
                <Avatar url={profile?.photoURL || authUser.photoURL} name={profile?.displayName || authUser.displayName || authUser.email} size={32} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border shadow-lg z-20 overflow-hidden" style={{ background: '#fff', borderColor: 'rgba(128,128,128,0.2)' }}>
                    <div className="px-3 py-3 border-b" style={{ borderColor: 'rgba(128,128,128,0.15)', color: '#1a1a1a' }}>
                      <div className="text-sm font-medium truncate">{profile?.displayName || 'You'}</div>
                      <div className="text-[11px] text-gray-500 truncate">{authUser.email}</div>
                    </div>
                    <button onClick={() => { setMenuOpen(false); setProfileOpen(true) }} className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 flex items-center gap-2" style={{ color: '#1a1a1a' }}>
                      <UserIcon className="w-3.5 h-3.5" /> Edit profile
                    </button>
                    <button onClick={() => { setMenuOpen(false); signOut() }} className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2">
                      <LogOut className="w-3.5 h-3.5" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1">
            <button onClick={() => setTab('mine')} className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 -mb-px transition ${tab === 'mine' ? 'border-current font-semibold' : 'border-transparent journal-muted'}`}>
              <Feather className="w-3.5 h-3.5" /> My Journal
            </button>
            <button onClick={() => setTab('community')} className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 -mb-px transition ${tab === 'community' ? 'border-current font-semibold' : 'border-transparent journal-muted'}`}>
              <Users className="w-3.5 h-3.5" /> Community
            </button>
          </div>
        </div>
        <div className="journal-divider h-px w-full" />
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {loading ? (
          <div className="flex items-center justify-center py-24 journal-muted">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : posts.length === 0 ? (
          tab === 'mine' ? (
            <EmptyMine onStart={() => { setEditing(null); setEditorOpen(true) }} name={profile?.displayName} />
          ) : (
            <EmptyCommunity onWrite={() => { setEditing(null); setEditorOpen(true) }} />
          )
        ) : (
          <div className="space-y-12">
            {groupKeys.map(key => (
              <section key={key}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="text-xs uppercase tracking-[0.2em] journal-muted font-medium">{key}</div>
                  <div className="flex-1 h-px journal-divider" />
                  <div className="text-xs journal-muted">{groups[key].length} {groups[key].length === 1 ? 'entry' : 'entries'}</div>
                </div>
                <div className="space-y-6">
                  {groups[key].map(p => (
                    <PostCard
                      key={p.id}
                      post={p}
                      canEdit={p.authorUid === authUser.uid}
                      onEdit={post => { setEditing(post); setEditorOpen(true) }}
                      onDelete={deletePost}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <footer className="mt-20 pt-8 border-t text-center text-xs journal-muted" style={{ borderColor: 'rgba(128,128,128,0.15)' }}>
          <div className="flex items-center justify-center gap-1.5">
            <Feather className="w-3 h-3" /> <span>Written with intention · The Tani Journal</span>
          </div>
        </footer>
      </main>

      <PostEditor open={editorOpen} onClose={() => { setEditorOpen(false); setEditing(null) }} onSave={savePost} initial={editing} />
      <StylePanel open={styleOpen} onClose={() => setStyleOpen(false)} theme={theme} setTheme={setTheme} font={font} setFont={setFont} />
      <ProfileEditor open={profileOpen} onClose={() => setProfileOpen(false)} profile={profile} onSave={saveProfile} />

      <button onClick={() => { setEditing(null); setEditorOpen(true) }} className="sm:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg journal-btn-primary flex items-center justify-center z-20">
        <Plus className="w-6 h-6" />
      </button>
    </div>
  )
}

function EmptyMine({ onStart, name }) {
  return (
    <div className="text-center py-16 sm:py-24 fade-up">
      <div className="relative inline-block mb-8">
        <div className="w-64 h-40 rounded-2xl overflow-hidden shadow-2xl rotate-[-3deg]">
          <img src="https://images.pexels.com/photos/33175914/pexels-photo-33175914.jpeg" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-xl overflow-hidden shadow-xl rotate-[6deg] border-4" style={{ borderColor: 'var(--card, #fff)' }}>
          <img src="https://images.unsplash.com/photo-1586380951230-e6703d9f6833" alt="" className="w-full h-full object-cover" />
        </div>
      </div>
      <h1 className="text-3xl sm:text-5xl font-semibold mb-3 leading-tight">
        {name ? `Welcome, ${name.split(' ')[0]}.` : 'Begin your story.'}
      </h1>
      <p className="journal-muted max-w-md mx-auto mb-8">
        Every great life is a collection of small, kept moments. Write your first entry, add a photograph — and let the timeline do the rest.
      </p>
      <button onClick={onStart} className="journal-btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium">
        <Feather className="w-4 h-4" /> Write your first entry
      </button>
    </div>
  )
}

function EmptyCommunity({ onWrite }) {
  return (
    <div className="text-center py-16 sm:py-24 fade-up">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6" style={{ background: 'rgba(128,128,128,0.15)' }}>
        <Users className="w-6 h-6" />
      </div>
      <h1 className="text-2xl sm:text-3xl font-semibold mb-3">The community is quiet.</h1>
      <p className="journal-muted max-w-md mx-auto mb-8">
        Be the first to share a moment. Mark an entry as <span className="inline-flex items-center gap-1"><Globe className="w-3 h-3" /> Public</span> and it will show up here.
      </p>
      <button onClick={onWrite} className="journal-btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium">
        <Feather className="w-4 h-4" /> Share something
      </button>
    </div>
  )
}

export default App
