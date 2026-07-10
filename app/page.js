'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import {
  BookOpen, Plus, Image as ImageIcon, X, Pencil, Trash2, Palette,
  Calendar, Heart, ChevronDown, Sparkles, Feather, Coffee, Moon,
  Sun, Trees, Loader2, Check, Users, Lock, Globe, LogOut, User as UserIcon,
  Mail, KeyRound, ArrowRight, Eye, MessageCircle, Flag, Send, UserPlus, UserCheck,
  Video, Film, ArrowLeft, HardDrive, Cloud, CloudOff, RefreshCw, Bell, Shield, AlertCircle
} from 'lucide-react'
import {
  auth, onAuthStateChanged, signInWithGoogle, signInEmail, signUpEmail, signOut, authedFetch,
  completeRedirectSignIn, connectDrive, disconnectDrive, isDriveConnected, resetPassword
} from '@/lib/firebase'

const THEMES = [
  { id: 'paper',    name: 'Paper',    icon: Sun,   swatch: 'linear-gradient(135deg, #faf7f2 0%, #efe8d8 100%)' },
  { id: 'midnight', name: 'Midnight', icon: Moon,  swatch: 'linear-gradient(135deg, #1a1b2e 0%, #06060d 100%)' },
  { id: 'sepia',    name: 'Sepia',    icon: Coffee, swatch: 'linear-gradient(135deg, #f4ecd8 0%, #d9c9a3 100%)' },
  { id: 'forest',   name: 'Forest',   icon: Trees, swatch: 'linear-gradient(135deg, #0f2620 0%, #1a4033 100%)' },
]
const FONTS = [
  { id: 'serif',   name: 'Fraunces',  preview: 'Aa', desc: 'Warm serif' },
  { id: 'sans',    name: 'Inter',     preview: 'Aa', desc: 'Modern sans' },
  { id: 'display', name: 'Playfair',  preview: 'Aa', desc: 'Editorial' },
  { id: 'mono',    name: 'JetBrains', preview: 'Aa', desc: 'Monospace' },
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
function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}
function groupByDate(list) {
  const groups = {}
  for (const p of list) {
    const key = new Date(p.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    ;(groups[key] = groups[key] || []).push(p)
  }
  return groups
}
function fmtCount(n) {
  if (!n) return '0'
  if (n < 1000) return String(n)
  if (n < 1000000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return (n / 1000000).toFixed(1) + 'M'
}

function Avatar({ url, name, size = 32, online, onClick }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase()
  const inner = url ? (
    <img src={url} alt="" style={{ width: size, height: size }} className="rounded-full object-cover" />
  ) : (
    <div style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="rounded-full flex items-center justify-center font-semibold"
    >
      <div style={{ width: size, height: size, background: 'currentColor', opacity: 0.15, borderRadius: '9999px', position: 'absolute' }} />
      <span style={{ position: 'relative' }}>{initial}</span>
    </div>
  )
  return (
    <div className="relative inline-block flex-shrink-0" style={{ width: size, height: size, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      {inner}
      {online !== undefined && (
        <span
          className="absolute rounded-full ring-2"
          style={{
            right: -1, bottom: -1,
            width: Math.max(8, size * 0.28),
            height: Math.max(8, size * 0.28),
            background: online ? '#3b82f6' : '#4b5563',
            boxShadow: online ? '0 0 0 2px currentColor' : 'none',
            ringColor: 'currentColor',
          }}
        />
      )}
    </div>
  )
}

// ---------- Landing Page with Public Feed ----------
function LandingPage({ onGetStarted, isDayMode, setIsDayMode }) {
  const [showPublicFeed, setShowPublicFeed] = useState(false)
  const [publicPosts, setPublicPosts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [presence, setPresence] = useState({})

  const search = async (q) => {
    if (!q || q.length < 2) {
      setPublicPosts([])
      return
    }
    setSearching(true)
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const j = await r.json()
      setPublicPosts(j.posts || [])
    } catch (e) { console.error(e) }
    finally { setSearching(false) }
  }

  const loadPublicPosts = async () => {
    setSearching(true)
    try {
      const r = await fetch('/api/posts?scope=community')
      const j = await r.json()
      setPublicPosts(j.posts || [])
      setShowPublicFeed(true)
    } catch (e) { console.error(e) }
    finally { setSearching(false) }
  }

  // Poll presence for visible posts
  useEffect(() => {
    if (publicPosts.length === 0) return
    const uids = [...new Set(publicPosts.map(p => p.authorUid).filter(Boolean))]
    if (uids.length === 0) return
    const load = async () => {
      try {
        const r = await fetch(`/api/presence?uids=${uids.join(',')}`)
        const j = await r.json()
        setPresence(j.presence || {})
      } catch (e) { /* ignore */ }
    }
    load()
    const iv = setInterval(load, 15000)
    return () => clearInterval(iv)
  }, [publicPosts])

  if (showPublicFeed) {
    return (
      <div className="min-h-screen">
        {/* Nav */}
        <nav className="sticky top-0 z-30 backdrop-blur-md" style={{ background: 'color-mix(in srgb, currentColor 4%, transparent)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <button onClick={() => setShowPublicFeed(false)} className="flex items-center gap-2.5 text-left">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'currentColor' }}>
                <BookOpen className="w-4 h-4" style={{ color: 'var(--bg-invert, #fff)', mixBlendMode: 'difference' }} />
              </div>
              <div>
                <div className="text-base font-semibold leading-tight" style={{ fontFamily: 'Fraunces, serif' }}>The Tani Journal</div>
                <div className="text-[11px] journal-muted leading-tight">Your story, beautifully kept</div>
              </div>
            </button>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsDayMode(!isDayMode)} className="journal-chip inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs border">
                {isDayMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                {isDayMode ? 'Day' : 'Night'}
              </button>
              <button onClick={onGetStarted} className="journal-btn-primary inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium">
                Sign in <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </nav>

        {/* Search */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex-1 relative">
              <input
                autoFocus
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value)
                  const q = e.target.value.trim()
                  if (q.length >= 2) search(q)
                }}
                placeholder="Search posts, moods, or stories..."
                className="journal-input w-full px-4 py-3 rounded-xl text-base border"
              />
              {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />}
            </div>
            <button onClick={() => setShowPublicFeed(false)} className="journal-btn-ghost px-4 py-3 rounded-xl text-sm">
              <ArrowLeft className="w-4 h-4 inline mr-2" /> Home
            </button>
          </div>

          {/* Results */}
          {publicPosts.length === 0 ? (
            <div className="text-center py-16 journal-muted">
              {searchQuery.length < 2 ? 'Enter at least 2 characters to search' : 'No posts found. Try a different search.'}
            </div>
          ) : (
            <div className="space-y-6">
              {publicPosts.map(p => (
                <PostCard key={p.id} post={p} canEdit={false} authUser={null} presence={presence}
                  onLike={() => onGetStarted()} onReport={() => onGetStarted()} onView={() => {}}
                  onOpenAuthor={() => {}} onCountChange={() => {}} />
              ))}
            </div>
          )}
        </div>

        <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-10 border-t text-center" style={{ borderColor: 'rgba(128,128,128,0.15)' }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs journal-muted">
            <div className="flex items-center gap-1.5"><Feather className="w-3 h-3" /> Written with intention · The Tani Journal</div>
            <div className="flex items-center gap-4">
              <button onClick={onGetStarted} className="hover:underline">Sign in</button>
              <span>·</span>
              <span>© {new Date().getFullYear()}</span>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen fade-up">
      {/* Nav */}
      <nav className="sticky top-0 z-30 backdrop-blur-md" style={{ background: 'color-mix(in srgb, currentColor 4%, transparent)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'currentColor' }}>
              <BookOpen className="w-4 h-4" style={{ color: 'var(--bg-invert, #fff)', mixBlendMode: 'difference' }} />
            </div>
            <div>
              <div className="text-base font-semibold leading-tight" style={{ fontFamily: 'Fraunces, serif' }}>The Tani Journal</div>
              <div className="text-[11px] journal-muted leading-tight">Your story, beautifully kept</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsDayMode(!isDayMode)} className="journal-chip inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs border">
              {isDayMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {isDayMode ? 'Day' : 'Night'}
            </button>
            <button onClick={onGetStarted} className="journal-btn-primary inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium">
              Sign in <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-24">
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-3 fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] uppercase tracking-widest journal-chip mb-6">
              <Sparkles className="w-3 h-3" /> A quiet place to write
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl leading-[1.05] font-semibold mb-6 tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>
              Your story,<br /><em className="italic journal-muted">beautifully</em> kept.
            </h1>
            <p className="journal-muted text-lg sm:text-xl max-w-xl mb-8 leading-relaxed">
              A media-rich journal that respects your moments. Write with intention, add the photograph, choose the mood — and let a beautiful timeline hold it all.
            </p>
            <p className="journal-muted text-lg sm:text-xl max-w-xl mb-10 leading-relaxed font-semibold">
              Write what you cannot say aloud.
            </p>
            <div className="flex flex-wrap items-center gap-3 mb-10">
              <button onClick={onGetStarted} className="journal-btn-primary inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-medium">
                <Feather className="w-4 h-4" /> Start your journal
              </button>
              <button onClick={loadPublicPosts} className="journal-chip inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm border">
                <Globe className="w-4 h-4" /> Browse community
              </button>
            </div>
            <div className="flex items-center gap-6 text-xs journal-muted">
              <div className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Private by default</div>
              <div className="flex items-center gap-1.5"><Cloud className="w-3.5 h-3.5" /> Optional Drive backup</div>
              <div className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5" /> Free forever</div>
            </div>
          </div>

          <div className="lg:col-span-2 relative">
            {/* Hero image stack */}
            <div className="relative aspect-[3/4] max-w-md mx-auto">
              <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl rotate-[2deg]" style={{ transform: 'rotate(3deg)' }}>
                <img src="https://images.unsplash.com/photo-1569360556894-15dca0c6ff1a" alt="" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-6 -left-6 w-40 h-52 rounded-2xl overflow-hidden shadow-xl border-4 rotate-[-6deg]" style={{ borderColor: 'var(--card, #fff)' }}>
                <img src="https://images.pexels.com/photos/17301678/pexels-photo-17301678.jpeg" alt="" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -top-4 -right-4 w-32 h-32 rounded-2xl overflow-hidden shadow-xl border-4 rotate-[8deg]" style={{ borderColor: 'var(--card, #fff)' }}>
                <img src="https://images.pexels.com/photos/15558300/pexels-photo-15558300.jpeg" alt="" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-xs uppercase tracking-[0.2em] journal-muted font-medium mb-3">Everything you need</div>
          <h2 className="text-3xl sm:text-5xl font-semibold leading-tight" style={{ fontFamily: 'Fraunces, serif' }}>
            A journal that feels made for you.
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Feather, title: 'Rich editor', body: 'Title, mood chips, free-form writing, and image or video attachments — with 16:9 or 3:4 aspect ratios you choose.' },
            { icon: Palette, title: 'Style engine', body: '4 themes × 4 typefaces. Paper, Midnight, Sepia, or Forest. Fraunces, Inter, Playfair, or JetBrains — flip a switch, feel a mood.' },
            { icon: Users, title: 'Public or private', body: 'Keep entries just for you, or share them to the Community feed. Follow writers whose voice you love.' },
            { icon: Cloud, title: 'Google Drive backup', body: 'Optional. Every entry mirrored as a clean markdown file in a folder in your Drive. Your words, portable forever.' },
            { icon: MessageCircle, title: 'Warm conversation', body: 'Likes, view counts, and threaded comments — with blue-dot presence so you know who is around.' },
            { icon: Shield, title: 'Kind by design', body: 'Report / flag inappropriate content. Owner-only edits and deletes. Privacy is the default, always.' },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="journal-card border rounded-2xl p-6 fade-up">
              <div className="w-10 h-10 rounded-xl inline-flex items-center justify-center mb-4" style={{ background: 'rgba(128,128,128,0.12)' }}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Fraunces, serif' }}>{title}</h3>
              <p className="journal-muted text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Themes preview */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] journal-muted font-medium mb-3">Feel the mood</div>
            <h2 className="text-3xl sm:text-5xl font-semibold leading-tight mb-4" style={{ fontFamily: 'Fraunces, serif' }}>Four backgrounds. Four typefaces. Yours to switch.</h2>
            <p className="journal-muted text-base leading-relaxed mb-6">
              Some mornings feel like <b>Paper</b>. Some evenings feel like <b>Midnight</b>. A slow Sunday deserves <b>Sepia</b>. A camping trip lives in <b>Forest</b>. Change your journal to match — and change the story it tells.
            </p>
            <button onClick={onGetStarted} className="journal-btn-primary inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium">
              Try it free <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'Paper',    swatch: 'linear-gradient(135deg, #faf7f2 0%, #efe8d8 100%)', text: '#2a2622', icon: Sun,   sub: 'Warm & bright' },
              { name: 'Midnight', swatch: 'linear-gradient(135deg, #1a1b2e 0%, #06060d 100%)', text: '#e8e6f0', icon: Moon,  sub: 'For late nights' },
              { name: 'Sepia',    swatch: 'linear-gradient(135deg, #f4ecd8 0%, #d9c9a3 100%)', text: '#3d2f1f', icon: Coffee, sub: 'Slow, unhurried' },
              { name: 'Forest',   swatch: 'linear-gradient(135deg, #0f2620 0%, #1a4033 100%)', text: '#dce8de', icon: Trees, sub: 'Grounded, wild' },
            ].map(t => {
              const Icon = t.icon
              return (
                <div key={t.name} className="rounded-2xl p-5 border shadow-sm" style={{ background: t.swatch, color: t.text, borderColor: 'rgba(0,0,0,0.08)' }}>
                  <Icon className="w-5 h-5 mb-6" />
                  <div className="text-lg font-semibold" style={{ fontFamily: 'Fraunces, serif' }}>{t.name}</div>
                  <div className="text-xs opacity-70">{t.sub}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Quote / testimonial-style */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
        <div className="journal-card border rounded-3xl p-8 sm:p-14">
          <div className="text-5xl mb-4 opacity-30">&ldquo;</div>
          <p className="text-xl sm:text-3xl leading-relaxed mb-6" style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic' }}>
            The life of every man is a diary in which he means to write one story, and writes another.
          </p>
          <div className="text-xs uppercase tracking-widest journal-muted">— J.M. Barrie</div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-28 text-center">
        <h2 className="text-4xl sm:text-6xl font-semibold leading-tight mb-6" style={{ fontFamily: 'Fraunces, serif' }}>
          Write the day.<br />Keep the year.
        </h2>
        <p className="journal-muted text-lg mb-10 max-w-xl mx-auto">
          Free forever. Private by default. Beautiful on your phone and your desktop. Start now — your first entry is one moment away.
        </p>
        <button onClick={onGetStarted} className="journal-btn-primary inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-medium">
          <Feather className="w-5 h-5" /> Begin your journal
        </button>
      </section>

      <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-10 border-t text-center" style={{ borderColor: 'rgba(128,128,128,0.15)' }}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs journal-muted">
          <div className="flex items-center gap-1.5"><Feather className="w-3 h-3" /> Written with intention · The Tani Journal</div>
          <div className="flex items-center gap-4">
            <button onClick={onGetStarted} className="hover:underline">Sign in</button>
            <span>·</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ---------- Sign In ----------
function SignInScreen({ onBack }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [showReset, setShowReset] = useState(false)

  const google = async () => {
    setErr(''); setInfo(''); setBusy(true)
    try { await signInWithGoogle() }
    catch (e) { setErr(e?.message || 'Google sign-in failed') }
    finally { setBusy(false) }
  }
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setInfo(''); setBusy(true)
    try {
      if (mode === 'signin') await signInEmail(email, password)
      else await signUpEmail(email, password, displayName || email.split('@')[0])
    } catch (e) { setErr(e?.message?.replace('Firebase: ', '') || 'Authentication failed') }
    finally { setBusy(false) }
  }
  const doReset = async () => {
    if (!email) { setErr('Enter your email above first, then tap "Forgot password?"'); return }
    setBusy(true); setErr(''); setInfo('')
    try {
      await resetPassword(email)
      setInfo(`Password reset link sent to ${email}. Check your inbox.`)
      setShowReset(false)
    } catch (e) { setErr(e?.message?.replace('Firebase: ', '') || 'Reset failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md fade-up">
        {onBack && (
          <button onClick={onBack} className="journal-btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to home
          </button>
        )}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'currentColor' }}>
            <BookOpen className="w-6 h-6" style={{ color: 'var(--bg-invert, #fff)', mixBlendMode: 'difference' }} />
          </div>
          <h1 className="text-4xl font-semibold mb-2" style={{ fontFamily: 'Fraunces, serif' }}>The Tani Journal</h1>
          <p className="journal-muted text-sm">A quiet place to write your Mésang (Imagination).</p>
        </div>
        <div className="journal-card border rounded-2xl p-6 sm:p-8">
          <div className="flex gap-1 p-1 rounded-lg mb-6" style={{ background: 'rgba(128,128,128,0.08)' }}>
            <button onClick={() => setMode('signin')} className={`flex-1 py-2 text-sm rounded-md ${mode === 'signin' ? 'journal-chip-active' : ''}`}>Sign in</button>
            <button onClick={() => setMode('signup')} className={`flex-1 py-2 text-sm rounded-md ${mode === 'signup' ? 'journal-chip-active' : ''}`}>Create account</button>
          </div>
          <button onClick={google} disabled={busy} className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border font-medium text-sm mb-5 hover:bg-white/5 disabled:opacity-50" style={{ borderColor: 'rgba(128,128,128,0.25)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            Continue with Google
          </button>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px journal-divider" /><span className="text-xs journal-muted">or with email</span><div className="flex-1 h-px journal-divider" />
          </div>
          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 journal-muted" />
                <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Display name" className="journal-input w-full pl-10 pr-3 py-3 rounded-xl text-sm" />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 journal-muted" />
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="journal-input w-full pl-10 pr-3 py-3 rounded-xl text-sm" />
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 journal-muted" />
              <input required type="password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min 6 chars)" className="journal-input w-full pl-10 pr-3 py-3 rounded-xl text-sm" />
            </div>
            {err && <div className="text-xs text-red-500 px-1">{err}</div>}
            {info && <div className="text-xs text-green-600 px-1">{info}</div>}
            {mode === 'signin' && (
              <div className="text-right">
                <button type="button" onClick={doReset} disabled={busy} className="text-xs journal-muted hover:underline disabled:opacity-50">
                  Forgot password?
                </button>
              </div>
            )}
            <button type="submit" disabled={busy} className="journal-btn-primary w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs journal-muted mt-6">A quiet place to keep your moments — privately, or shared with friends.</p>
      </div>
    </div>
  )
}

// ---------- Media preview (image or video) ----------
function MediaTile({ media, className = '' }) {
  const ratio = media.aspectRatio === '3:4' ? 'aspect-3-4' : 'aspect-16-9'
  if (media.type === 'video') {
    return (
      <div className={`${ratio} ${className} bg-black`}>
        <video src={media.url} controls playsInline className="w-full h-full object-cover" />
      </div>
    )
  }
  return (
    <div className={`${ratio} ${className}`}>
      <img src={media.url} alt="" className="w-full h-full object-cover" />
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
  const [uploadErr, setUploadErr] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    if (open) {
      setTitle(initial?.title || '')
      setContent(initial?.content || '')
      setMood(initial?.mood || '')
      setImages(initial?.images || [])
      setVisibility(initial?.visibility || 'private')
      setUploadErr('')
    }
  }, [open, initial])

  const handleFile = async (e) => {
    setUploadErr('')
    const files = Array.from(e.target.files || [])
    for (const f of files) {
      const isImage = f.type.startsWith('image/')
      const isVideo = f.type.startsWith('video/')
      if (!isImage && !isVideo) continue
      // 20MB cap for MVP base64 embedding
      if (f.size > 20 * 1024 * 1024) {
        setUploadErr(`"${f.name}" is over 20MB. Try a smaller file.`)
        continue
      }
      const dataUrl = await new Promise(res => {
        const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f)
      })
      setImages(prev => [...prev, { url: dataUrl, aspectRatio: isVideo ? '16:9' : '16:9', type: isVideo ? 'video' : 'image' }].slice(0, 6))
    }
    e.target.value = ''
  }
  const addSample = (url) => setImages(prev => [...prev, { url, aspectRatio: '16:9', type: 'image' }].slice(0, 6))
  const setRatio = (i, ratio) => setImages(prev => prev.map((im, idx) => idx === i ? { ...im, aspectRatio: ratio } : im))
  const removeImg = (i) => setImages(prev => prev.filter((_, idx) => idx !== i))

  const submit = async () => {
    if (!title.trim() && !content.trim() && images.length === 0) return
    setSaving(true)
    try { await onSave({ title: title.trim() || 'Untitled Entry', content, mood, images, visibility }); onClose() }
    finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-0 sm:p-6 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}>
      <div className="journal-card w-full max-w-3xl rounded-none sm:rounded-2xl border my-0 sm:my-8 fade-up">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'inherit' }}>
          <div className="flex items-center gap-2"><Feather className="w-4 h-4" /><span className="text-sm font-medium">{initial ? 'Edit entry' : 'New journal entry'}</span></div>
          <button onClick={onClose} className="journal-btn-ghost p-2 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-6 space-y-5">
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Give this moment a title…" className="journal-input w-full text-2xl sm:text-3xl font-semibold px-0 py-2 bg-transparent border-0 rounded-none focus:outline-none" style={{ borderColor: 'transparent' }} />
          <div className="flex flex-wrap gap-2">
            {MOODS.map(m => <button key={m} onClick={() => setMood(mood === m ? '' : m)} className={`px-3 py-1.5 rounded-full text-xs border ${mood === m ? 'journal-chip-active' : 'journal-chip'}`}>{m}</button>)}
          </div>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="What happened today? What did it feel like? Write freely…" rows={8} className="journal-input w-full text-base px-4 py-3 rounded-xl resize-none focus:outline-none" />

          {images.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {images.map((im, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(128,128,128,0.2)' }}>
                  <MediaTile media={im} />
                  {im.type === 'video' && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] inline-flex items-center gap-1">
                      <Film className="w-3 h-3" /> Video
                    </div>
                  )}
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
              <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFile} />
              <button onClick={() => fileRef.current?.click()} className="journal-chip inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs border">
                <ImageIcon className="w-3.5 h-3.5" /> Photo or <Video className="w-3.5 h-3.5" /> video
              </button>
              <span className="text-xs journal-muted">up to 20MB each</span>
            </div>
            {uploadErr && <div className="text-xs text-red-500">{uploadErr}</div>}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {SAMPLE_IMAGES.map(u => (
                <button key={u} onClick={() => addSample(u)} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border hover:scale-105" style={{ borderColor: 'rgba(128,128,128,0.25)' }}>
                  <img src={u} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button onClick={() => setVisibility('private')} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${visibility === 'private' ? 'journal-chip-active' : 'journal-chip'}`}><Lock className="w-3 h-3" /> Private · only me</button>
            <button onClick={() => setVisibility('public')} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${visibility === 'public' ? 'journal-chip-active' : 'journal-chip'}`}><Globe className="w-3 h-3" /> Public · community</button>
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

// ---------- Comments Panel ----------
function CommentsPanel({ post, authUser, onCountChange }) {
  const [comments, setComments] = useState(null)
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await authedFetch(`/api/posts/${post.id}/comments`)
      const j = await r.json(); setComments(j.comments || [])
    } catch (e) { console.error(e) }
  }, [post.id])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    // Poll every 8s for near-realtime
    const iv = setInterval(load, 8000)
    return () => clearInterval(iv)
  }, [load])

  const send = async () => {
    const c = content.trim()
    if (!c) return
    setPosting(true)
    try {
      const r = await authedFetch(`/api/posts/${post.id}/comments`, { method: 'POST', body: JSON.stringify({ content: c }) })
      const j = await r.json()
      if (j.comment) {
        setComments(prev => [...(prev || []), j.comment])
        onCountChange?.(1)
      }
      setContent('')
    } finally { setPosting(false) }
  }
  const del = async (id) => {
    if (!confirm('Delete this comment?')) return
    await authedFetch(`/api/comments/${id}`, { method: 'DELETE' })
    setComments(prev => (prev || []).filter(c => c.id !== id))
    onCountChange?.(-1)
  }
  const startEdit = (c) => {
    setEditingId(c.id)
    setEditContent(c.content)
  }
  const cancelEdit = () => {
    setEditingId(null)
    setEditContent('')
  }
  const saveEdit = async (id) => {
    const updated = editContent.trim()
    if (!updated) return
    setEditSaving(true)
    try {
      const r = await authedFetch(`/api/comments/${id}`, { method: 'PUT', body: JSON.stringify({ content: updated }) })
      const j = await r.json()
      if (j.comment) {
        setComments(prev => prev.map(c => c.id === id ? j.comment : c))
        setEditingId(null)
        setEditContent('')
      }
    } catch (e) { console.error(e) }
    finally { setEditSaving(false) }
  }

  return (
    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(128,128,128,0.15)' }}>
      <div className="flex items-start gap-2 mb-4">
        <input
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Share a thought…"
          className="journal-input flex-1 px-3 py-2 rounded-lg text-sm"
        />
        <button onClick={send} disabled={posting || !content.trim()} className="journal-btn-primary p-2 rounded-lg disabled:opacity-50">
          {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
      {comments === null ? (
        <div className="text-xs journal-muted text-center py-3"><Loader2 className="w-3 h-3 animate-spin inline" /></div>
      ) : comments.length === 0 ? (
        <div className="text-xs journal-muted text-center py-3">Be the first to comment.</div>
      ) : (
        <div className="space-y-3">
          {comments.map(c => (
            <div key={c.id} className="flex items-start gap-2.5">
              <Avatar url={c.author?.photoURL} name={c.author?.displayName} size={28} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">{c.author?.displayName || 'Someone'}</span>
                  <span className="journal-muted">{timeAgo(c.createdAt)}</span>
                  {c.updatedAt && c.updatedAt !== c.createdAt && <span className="journal-muted text-[10px]">(edited)</span>}
                </div>
                {editingId === c.id ? (
                  <div className="mt-2">
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      className="journal-input w-full px-2 py-1.5 rounded-lg text-sm resize-none"
                      rows={3}
                    />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => saveEdit(c.id)} disabled={editSaving} className="journal-btn-primary inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs disabled:opacity-50">
                        {editSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                      </button>
                      <button onClick={cancelEdit} className="journal-btn-ghost inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs">
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm mt-0.5 break-words">{c.content}</div>
                )}
              </div>
              {authUser && c.authorUid === authUser.uid && editingId !== c.id && (
                <div className="flex gap-1">
                  <button onClick={() => startEdit(c)} className="journal-btn-ghost p-1 rounded-md"><Pencil className="w-3 h-3" /></button>
                  <button onClick={() => del(c.id)} className="journal-btn-ghost p-1 rounded-md"><Trash2 className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- Post Card ----------
function PostCard({ post, canEdit, authUser, presence, onEdit, onDelete, onLike, onReport, onOpenAuthor, onView, onCountChange }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [reporting, setReporting] = useState(false)
  const first = post.images?.[0]
  const rest = post.images?.slice(1) || []
  const authorOnline = presence?.[post.authorUid]

  // Count view once when card is on-screen
  const observed = useRef(false)
  const cardRef = useRef(null)
  useEffect(() => {
    if (!cardRef.current || observed.current || post.visibility !== 'public') return
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting && !observed.current) {
          observed.current = true
          onView?.(post.id)
        }
      })
    }, { threshold: 0.5 })
    io.observe(cardRef.current)
    return () => io.disconnect()
  }, [post.id, post.visibility, onView])

  const doReport = async () => {
    setMenuOpen(false)
    const reason = prompt('Why are you reporting this post? (optional)') || ''
    if (reason === null) return
    setReporting(true)
    try { await onReport(post, reason); alert('Thanks. Our moderators will review this.') }
    finally { setReporting(false) }
  }

  return (
    <article ref={cardRef} className="journal-card rounded-2xl border overflow-hidden fade-up">
      {first && (
        <MediaTile media={first} />
      )}
      <div className="p-6 sm:p-7">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {post.author && (
              <Avatar
                url={post.author.photoURL}
                name={post.author.displayName}
                size={32}
                online={authorOnline}
                onClick={() => onOpenAuthor?.(post.author.uid)}
              />
            )}
            <div className="min-w-0">
              <button onClick={() => post.author && onOpenAuthor?.(post.author.uid)} className="text-sm font-medium truncate hover:underline text-left">
                {post.author?.displayName || 'Someone'}
              </button>
              <div className="flex items-center gap-1.5 text-[11px] journal-muted">
                <Calendar className="w-3 h-3" /><span>{formatDate(post.createdAt)}</span>
                {post.mood && <><span>·</span><span>{post.mood}</span></>}
                <span>·</span>
                <span className="inline-flex items-center gap-1">{post.visibility === 'public' ? <><Globe className="w-2.5 h-2.5" /> Public</> : <><Lock className="w-2.5 h-2.5" /> Private</>}</span>
              </div>
            </div>
          </div>
          <div className="relative">
            <button onClick={() => setMenuOpen(v => !v)} className="journal-btn-ghost p-2 rounded-lg"><ChevronDown className="w-4 h-4" /></button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border shadow-lg z-20 overflow-hidden" style={{ background: '#fff', borderColor: 'rgba(128,128,128,0.2)' }}>
                  {canEdit ? (
                    <>
                      <button onClick={() => { setMenuOpen(false); onEdit(post) }} className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 flex items-center gap-2" style={{ color: '#1a1a1a' }}><Pencil className="w-3.5 h-3.5" /> Edit entry</button>
                      <button onClick={() => { setMenuOpen(false); onDelete(post) }} className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                    </>
                  ) : (
                    <button onClick={doReport} disabled={reporting} className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 text-orange-600 flex items-center gap-2"><Flag className="w-3.5 h-3.5" /> Report post</button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-semibold leading-tight mb-3">{post.title}</h2>
        {post.content && <div className="journal-prose mt-2">{post.content}</div>}

        {rest.length > 0 && (
          <div className={`mt-5 grid gap-2 ${rest.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {rest.map((im, i) => <div key={i} className="rounded-lg overflow-hidden"><MediaTile media={im} /></div>)}
          </div>
        )}

        <div className="mt-6 flex items-center gap-1 text-xs journal-muted">
          <button onClick={() => onLike(post)} className="journal-btn-ghost inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg">
            <Heart className={`w-3.5 h-3.5 ${post.likedByMe ? 'fill-red-500 text-red-500' : ''}`} />
            <span>{fmtCount(post.likeCount)}</span>
          </button>
          <button onClick={() => setShowComments(v => !v)} className="journal-btn-ghost inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg">
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{fmtCount(post.commentCount)}</span>
          </button>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5"><Eye className="w-3.5 h-3.5" /><span>{fmtCount(post.viewCount)}</span></span>
        </div>

        {showComments && <CommentsPanel post={post} authUser={authUser} onCountChange={(d) => onCountChange?.(post.id, d)} />}
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
        <div className="flex items-center gap-2 mb-4"><Sparkles className="w-4 h-4" /><h3 className="font-semibold text-sm">Style your journal</h3></div>
        <div className="mb-5">
          <div className="text-xs journal-muted uppercase tracking-wider mb-2">Background</div>
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map(t => {
              const Icon = t.icon
              return (
                <button key={t.id} onClick={() => setTheme(t.id)} className={`p-3 rounded-xl border text-left ${theme === t.id ? 'ring-2 ring-offset-2' : ''}`} style={{ borderColor: theme === t.id ? 'currentColor' : 'rgba(128,128,128,0.2)' }}>
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
              <button key={f.id} onClick={() => setFont(f.id)} className={`p-3 rounded-xl border text-left ${font === f.id ? 'ring-2 ring-offset-2' : ''}`} style={{ borderColor: font === f.id ? 'currentColor' : 'rgba(128,128,128,0.2)', fontFamily: f.id === 'serif' ? 'Fraunces, serif' : f.id === 'sans' ? 'Inter, sans-serif' : f.id === 'mono' ? 'JetBrains Mono, monospace' : 'Playfair Display, serif' }}>
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
    if (open && profile) { setDisplayName(profile.displayName || ''); setPhotoURL(profile.photoURL || ''); setBio(profile.bio || '') }
  }, [open, profile])
  const pickPhoto = async (e) => {
    const f = e.target.files?.[0]
    if (!f || !f.type.startsWith('image/')) return
    const dataUrl = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f) })
    setPhotoURL(dataUrl); e.target.value = ''
  }
  const submit = async () => { setSaving(true); try { await onSave({ displayName, photoURL, bio }); onClose() } finally { setSaving(false) } }
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
            <Avatar url={photoURL} name={displayName || 'A'} size={64} />
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
              <button onClick={() => fileRef.current?.click()} className="journal-chip inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border"><ImageIcon className="w-3.5 h-3.5" /> Change photo</button>
              {photoURL && <button onClick={() => setPhotoURL('')} className="ml-2 text-xs journal-muted hover:underline">Remove</button>}
            </div>
          </div>
          <div>
            <label className="text-xs journal-muted uppercase tracking-wider block mb-1">Display name</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="journal-input w-full px-3 py-2 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs journal-muted uppercase tracking-wider block mb-1">Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={280} className="journal-input w-full px-3 py-2 rounded-lg text-sm resize-none" />
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

// ---------- Author Profile Page ----------
function AuthorView({ uid, authUser, presence, onBack, onLike, onReport, onView, onCountChange }) {
  const [data, setData] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyFollow, setBusyFollow] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredPosts, setFilteredPosts] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pr, po] = await Promise.all([
        authedFetch(`/api/profiles/${uid}`).then(r => r.json()),
        authedFetch(`/api/profiles/${uid}/posts`).then(r => r.json()),
      ])
      setData(pr); setPosts(po.posts || [])
      setFilteredPosts(po.posts || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [uid])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) {
      setFilteredPosts(posts)
    } else {
      setFilteredPosts(posts.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        (p.mood && p.mood.toLowerCase().includes(q))
      ))
    }
  }, [searchQuery, posts])

  const toggleFollow = async () => {
    setBusyFollow(true)
    try {
      const r = await authedFetch(`/api/follow/${uid}`, { method: 'POST' })
      const j = await r.json()
      setData(prev => ({ ...prev, isFollowing: j.following, stats: { ...prev.stats, followerCount: (prev.stats?.followerCount || 0) + (j.following ? 1 : -1) } }))
    } finally { setBusyFollow(false) }
  }

  if (loading || !data) {
    return <div className="max-w-3xl mx-auto px-6 py-24 text-center journal-muted"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
  }

  const online = presence?.[uid]
  const isMe = authUser?.uid === uid

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <button onClick={onBack} className="journal-btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      <div className="journal-card border rounded-2xl p-6 sm:p-8 mb-8">
        <div className="flex items-start gap-4 sm:gap-6">
          <Avatar url={data.profile.photoURL} name={data.profile.displayName} size={80} online={online} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-semibold">{data.profile.displayName}</h1>
              {!isMe && (
                <button onClick={toggleFollow} disabled={busyFollow}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${data.isFollowing ? 'journal-chip' : 'journal-btn-primary'}`}>
                  {busyFollow ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (data.isFollowing ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />)}
                  {data.isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
            {data.profile.bio && <p className="journal-muted mt-2 text-sm">{data.profile.bio}</p>}
            <div className="flex gap-5 mt-4 text-sm">
              <span><b>{fmtCount(data.stats.postCount)}</b> <span className="journal-muted">entries</span></span>
              <span><b>{fmtCount(data.stats.followerCount)}</b> <span className="journal-muted">followers</span></span>
              <span><b>{fmtCount(data.stats.followingCount)}</b> <span className="journal-muted">following</span></span>
            </div>
          </div>
        </div>
      </div>

      {posts.length > 0 && (
        <div className="mb-6">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search this author's posts..."
            className="journal-input w-full px-4 py-2.5 rounded-xl text-sm border"
          />
          {searchQuery && (
            <div className="text-xs journal-muted mt-2">
              {filteredPosts.length} of {posts.length} {posts.length === 1 ? 'entry' : 'entries'} match your search
            </div>
          )}
        </div>
      )}

      {filteredPosts.length === 0 ? (
        <div className="text-center py-16 journal-muted">
          {posts.length === 0 ? 'No public entries yet.' : 'No entries match your search.'}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredPosts.map(p => (
            <PostCard key={p.id} post={p} canEdit={false} authUser={authUser} presence={presence}
              onLike={onLike} onReport={onReport} onView={onView} onCountChange={onCountChange} />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- Admin Panel ----------
function AdminPanel({ open, onClose }) {
  const [reports, setReports] = useState(null)
  const [busy, setBusy] = useState(null) // id being acted on
  const load = useCallback(async () => {
    try {
      const r = await authedFetch('/api/admin/reports')
      const j = await r.json()
      setReports(j.reports || [])
    } catch (e) { console.error(e) }
  }, [])
  useEffect(() => { if (open) load() }, [open, load])

  const resolve = async (rep) => {
    setBusy(rep.id)
    try {
      await authedFetch(`/api/admin/reports/${rep.id}/resolve`, { method: 'POST', body: JSON.stringify({ note: 'Reviewed - no action' }) })
      setReports(prev => prev.map(r => r.id === rep.id ? { ...r, status: 'resolved' } : r))
    } finally { setBusy(null) }
  }
  const removePost = async (rep) => {
    if (!confirm(`Remove post "${rep.post?.title || rep.postId}" permanently?`)) return
    setBusy(rep.id)
    try {
      await authedFetch(`/api/admin/posts/${rep.postId}`, { method: 'DELETE' })
      setReports(prev => prev.map(r => r.postId === rep.postId ? { ...r, status: 'resolved', post: null } : r))
    } finally { setBusy(null) }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}>
      <div className="journal-card w-full max-w-2xl rounded-2xl border my-8 fade-up">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'inherit' }}>
          <div className="flex items-center gap-2"><Shield className="w-4 h-4" /><span className="text-sm font-semibold">Moderation queue</span></div>
          <button onClick={onClose} className="journal-btn-ghost p-2 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6">
          {reports === null ? (
            <div className="text-center py-12 journal-muted"><Loader2 className="w-4 h-4 animate-spin inline" /></div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 journal-muted text-sm">No reports. All quiet on the front. 🕊️</div>
          ) : (
            <div className="space-y-4">
              {reports.map(rep => (
                <div key={rep.id} className="border rounded-xl p-4" style={{ borderColor: 'rgba(128,128,128,0.2)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs journal-muted">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Reported {timeAgo(rep.createdAt)}</span>
                      <span>·</span>
                      <span className={rep.status === 'resolved' ? 'text-green-600' : 'text-orange-500'}>{rep.status}</span>
                    </div>
                    {rep.reporter && (
                      <div className="flex items-center gap-1.5 text-xs journal-muted">
                        <span>by</span><Avatar url={rep.reporter.photoURL} name={rep.reporter.displayName} size={20} />
                        <span>{rep.reporter.displayName}</span>
                      </div>
                    )}
                  </div>
                  {rep.post ? (
                    <div className="mb-3">
                      <div className="font-medium mb-1">{rep.post.title}</div>
                      <div className="text-xs journal-muted mb-1">by {rep.author?.displayName || '?'} · {formatDate(rep.post.createdAt)}</div>
                      {rep.post.content && <div className="text-sm line-clamp-3 journal-muted">{rep.post.content}</div>}
                    </div>
                  ) : (
                    <div className="text-xs italic journal-muted mb-3">(Post has been removed)</div>
                  )}
                  {rep.reason && (
                    <div className="text-xs journal-muted italic mb-3">Reason: {`"${rep.reason}"`}</div>
                  )}
                  {rep.status !== 'resolved' && rep.post && (
                    <div className="flex gap-2">
                      <button onClick={() => resolve(rep)} disabled={busy === rep.id} className="journal-chip inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border disabled:opacity-50">
                        <Check className="w-3 h-3" /> Dismiss (allow)
                      </button>
                      <button onClick={() => removePost(rep)} disabled={busy === rep.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                        <Trash2 className="w-3 h-3" /> Remove post
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------- Main App ----------
function App() {
  const [authUser, setAuthUser] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('mine') // 'mine' | 'community' | 'following'
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, setTheme] = useState('paper')
  const [font, setFont] = useState('serif')
  const [styleOpen, setStyleOpen] = useState(false)
  const [viewingAuthor, setViewingAuthor] = useState(null)
  const [presence, setPresence] = useState({})
  const [driveConnected, setDriveConnected] = useState(false)
  const [driveSyncing, setDriveSyncing] = useState(false)
  const [driveMsg, setDriveMsg] = useState('')
  const [showSignIn, setShowSignIn] = useState(false)
  const [notifs, setNotifs] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifOpen, setNotifOpen] = useState(false)
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [isDayMode, setIsDayMode] = useState(true)
  const [envMissing, setEnvMissing] = useState(null)

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.__TANI_ENV_MISSING__) setEnvMissing(window.__TANI_ENV_MISSING__)
    } catch (e) {}
    const t = localStorage.getItem('tani-theme'); if (t) setTheme(t)
    const f = localStorage.getItem('tani-font'); if (f) setFont(f)
    const d = localStorage.getItem('tani-daymode'); if (d !== null) setIsDayMode(JSON.parse(d))
  }, [])
  useEffect(() => {
    // Apply theme based on auth state and isDayMode
    if (authUser) {
      document.documentElement.setAttribute('data-theme', theme)
    } else {
      // On landing page, apply theme based on isDayMode
      document.documentElement.setAttribute('data-theme', isDayMode ? 'paper' : 'midnight')
    }
    localStorage.setItem('tani-theme', theme)
  }, [theme, authUser, isDayMode])
  useEffect(() => { document.documentElement.setAttribute('data-font', font); localStorage.setItem('tani-font', font) }, [font])
  useEffect(() => { localStorage.setItem('tani-daymode', JSON.stringify(isDayMode)) }, [isDayMode])

  useEffect(() => {
    completeRedirectSignIn()
    const unsub = onAuthStateChanged(auth, async (u) => {
      setAuthUser(u || null)
      if (u) {
        try {
          const r = await authedFetch('/api/me')
          const j = await r.json()
          setProfile(j.profile || null)
        } catch (e) { console.error(e) }
      } else { setProfile(null); setPosts([]) }
    })
    return () => unsub()
  }, [])

  // Heartbeat every 25s
  useEffect(() => {
    if (!authUser) return
    const beat = () => authedFetch('/api/heartbeat', { method: 'POST' }).catch(() => {})
    beat()
    const iv = setInterval(beat, 25000)
    return () => clearInterval(iv)
  }, [authUser])

  // Drive connection state
  useEffect(() => {
    if (!authUser) { setDriveConnected(false); return }
    setDriveConnected(isDriveConnected())
    const iv = setInterval(() => setDriveConnected(isDriveConnected()), 10000)
    return () => clearInterval(iv)
  }, [authUser])

  // Poll notifications + admin status
  useEffect(() => {
    if (!authUser) return
    const loadNotifs = async () => {
      try {
        const r = await authedFetch('/api/notifications')
        const j = await r.json()
        setNotifs(j.notifications || [])
        setUnreadCount(j.unread || 0)
      } catch (e) { /* ignore */ }
    }
    const loadAdmin = async () => {
      try {
        const r = await authedFetch('/api/admin/status')
        const j = await r.json()
        setIsAdminUser(!!j.isAdmin)
      } catch (e) { /* ignore */ }
    }
    loadNotifs(); loadAdmin()
    const iv = setInterval(loadNotifs, 20000)
    return () => clearInterval(iv)
  }, [authUser])

  const markNotifsRead = async () => {
    if (unreadCount === 0) return
    setUnreadCount(0)
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    try { await authedFetch('/api/notifications/read', { method: 'POST' }) } catch { /* ignore */ }
  }

  const doConnectDrive = async () => {
    setDriveMsg('')
    try {
      await connectDrive()
      setDriveConnected(isDriveConnected())
      setDriveMsg('Google Drive connected!')
      setTimeout(() => setDriveMsg(''), 3000)
    } catch (e) {
      console.error(e)
      setDriveMsg('Drive connect failed: ' + (e?.message || 'unknown'))
      setTimeout(() => setDriveMsg(''), 5000)
    }
  }
  const doDisconnectDrive = () => {
    disconnectDrive()
    setDriveConnected(false)
    setDriveMsg('Drive disconnected.')
    setTimeout(() => setDriveMsg(''), 2500)
  }
  const doSyncAllToDrive = async () => {
    if (!isDriveConnected()) return doConnectDrive()
    setDriveSyncing(true); setDriveMsg('')
    try {
      const r = await authedFetch('/api/drive/sync-all', { method: 'POST' })
      const j = await r.json()
      if (r.ok) {
        setDriveMsg(`Synced ${j.syncedCount}/${j.total} entries to Drive`)
      } else if (r.status === 401) {
        // Token expired - disconnect + reprompt
        disconnectDrive(); setDriveConnected(false)
        setDriveMsg('Drive token expired \u2014 tap Connect Drive to refresh')
      } else {
        setDriveMsg('Sync failed: ' + (j.error || 'unknown'))
      }
      setTimeout(() => setDriveMsg(''), 5000)
    } catch (e) { setDriveMsg('Sync failed'); setTimeout(() => setDriveMsg(''), 3000) }
    finally { setDriveSyncing(false) }
  }

  const fetchPosts = useCallback(async (which) => {
    if (!authUser) return
    setLoading(true)
    try {
      const r = await authedFetch(`/api/posts?scope=${which}`)
      const j = await r.json()
      setPosts(j.posts || [])
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [authUser])

  useEffect(() => {
    if (authUser && !viewingAuthor) fetchPosts(tab)
  }, [authUser, tab, viewingAuthor, fetchPosts])

  // Poll presence every 15s for visible authors
  useEffect(() => {
    if (!authUser) return
    const uids = [...new Set(posts.map(p => p.authorUid).filter(u => u && u !== authUser.uid))]
    if (uids.length === 0) { setPresence({}); return }
    const load = async () => {
      try {
        const r = await authedFetch(`/api/presence?uids=${uids.join(',')}`)
        const j = await r.json()
        setPresence(j.presence || {})
      } catch (e) { /* ignore */ }
    }
    load()
    const iv = setInterval(load, 15000)
    return () => clearInterval(iv)
  }, [posts, authUser])

  const savePost = async (data) => {
    let savedPost = null
    if (editing) {
      const r = await authedFetch(`/api/posts/${editing.id}`, { method: 'PUT', body: JSON.stringify(data) })
      const j = await r.json()
      if (j.post) { savedPost = j.post; setPosts(prev => prev.map(p => p.id === j.post.id ? j.post : p)) }
      setEditing(null)
    } else {
      const r = await authedFetch('/api/posts', { method: 'POST', body: JSON.stringify(data) })
      const j = await r.json()
      savedPost = j.post
      setTab('mine'); fetchPosts('mine')
    }
    // Auto-sync to Drive if connected
    if (savedPost && isDriveConnected()) {
      authedFetch(`/api/drive/sync/${savedPost.id}`, { method: 'POST' })
        .then(r => r.ok ? setDriveMsg('Saved to Drive \u2713') : setDriveMsg('Drive sync failed'))
        .then(() => setTimeout(() => setDriveMsg(''), 2500))
        .catch(() => {})
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

  const toggleLike = async (p) => {
    // Optimistic
    setPosts(prev => prev.map(x => x.id === p.id ? { ...x, likedByMe: !x.likedByMe, likeCount: (x.likeCount || 0) + (x.likedByMe ? -1 : 1) } : x))
    try {
      const r = await authedFetch(`/api/posts/${p.id}/like`, { method: 'POST' })
      const j = await r.json()
      setPosts(prev => prev.map(x => x.id === p.id ? { ...x, likedByMe: j.liked, likeCount: j.likeCount } : x))
    } catch (e) { console.error(e) }
  }
  const reportPost = async (p, reason) => {
    await authedFetch(`/api/posts/${p.id}/report`, { method: 'POST', body: JSON.stringify({ reason }) })
  }
  const recordView = async (postId) => {
    try {
      const r = await authedFetch(`/api/posts/${postId}/view`, { method: 'POST' })
      const j = await r.json()
      if (typeof j.viewCount === 'number') {
        setPosts(prev => prev.map(x => x.id === postId ? { ...x, viewCount: j.viewCount } : x))
      }
    } catch (e) { /* ignore */ }
  }
  const adjustCommentCount = (postId, delta) => {
    setPosts(prev => prev.map(x => x.id === postId ? { ...x, commentCount: Math.max(0, (x.commentCount || 0) + delta) } : x))
  }

  const groups = useMemo(() => groupByDate(posts), [posts])
  const groupKeys = Object.keys(groups)

  if (authUser === undefined) return <div className="min-h-screen flex items-center justify-center journal-muted"><Loader2 className="w-5 h-5 animate-spin" /></div>
  if (!authUser) {
    return showSignIn
      ? <SignInScreen onBack={() => setShowSignIn(false)} />
      : <LandingPage onGetStarted={() => setShowSignIn(true)} isDayMode={isDayMode} setIsDayMode={setIsDayMode} />
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 backdrop-blur-md" style={{ background: 'color-mix(in srgb, currentColor 4%, transparent)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={() => setViewingAuthor(null)} className="flex items-center gap-2.5 text-left">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'currentColor' }}>
              <BookOpen className="w-4 h-4" style={{ color: 'var(--bg-invert, #fff)', mixBlendMode: 'difference' }} />
            </div>
            <div>
              <div className="text-base font-semibold leading-tight" style={{ fontFamily: 'Fraunces, serif' }}>The Tani Journal</div>
              <div className="text-[11px] journal-muted leading-tight">Your story, beautifully kept</div>
            </div>
          </button>
          <div className="flex items-center gap-1">
            {driveConnected && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }} title="Google Drive connected — journal is being backed up as markdown">
                <Cloud className="w-3 h-3" /> Drive
              </span>
            )}
            <button onClick={() => setStyleOpen(true)} className="journal-btn-ghost inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs"><Palette className="w-3.5 h-3.5" /><span className="hidden sm:inline">Style</span></button>
            <div className="relative">
              <button onClick={() => { setNotifOpen(v => !v); if (!notifOpen) markNotifsRead() }} className="journal-btn-ghost relative inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs">
                <Bell className="w-3.5 h-3.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-1" style={{ background: '#ef4444', color: '#fff' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border shadow-lg z-20" style={{ background: '#fff', borderColor: 'rgba(128,128,128,0.2)', color: '#1a1a1a' }}>
                    <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(128,128,128,0.15)' }}>
                      <span className="text-sm font-semibold">Notifications</span>
                    </div>
                    {notifs.length === 0 ? (
                      <div className="p-8 text-center text-xs text-gray-500">Nothing yet.</div>
                    ) : (
                      <div>
                        {notifs.map(n => (
                          <button
                            key={n.id}
                            onClick={() => { setNotifOpen(false); if (n.actorUid) setViewingAuthor(n.actorUid) }}
                            className="w-full text-left px-4 py-3 hover:bg-black/5 flex items-start gap-3 border-b"
                            style={{ borderColor: 'rgba(128,128,128,0.08)' }}
                          >
                            <Avatar url={n.actor?.photoURL} name={n.actor?.displayName} size={32} />
                            <div className="flex-1 min-w-0 text-sm">
                              <div>
                                <b>{n.actor?.displayName || 'Someone'}</b>{' '}
                                {n.type === 'like' && 'liked your entry'}
                                {n.type === 'comment' && 'commented on your entry'}
                                {n.type === 'follow' && 'started following you'}
                                {n.meta?.postTitle && <> · <span className="text-gray-500">{`"${n.meta.postTitle}"`}</span></>}
                              </div>
                              {n.type === 'comment' && n.meta?.snippet && (
                                <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{`"${n.meta.snippet}"`}</div>
                              )}
                              <div className="text-[11px] text-gray-500 mt-0.5">{timeAgo(n.createdAt)}</div>
                            </div>
                            {!n.read && <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: '#3b82f6' }} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            {isAdminUser && (
              <button onClick={() => setAdminOpen(true)} className="journal-btn-ghost inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs" title="Moderation queue">
                <Shield className="w-3.5 h-3.5" /><span className="hidden sm:inline">Admin</span>
              </button>
            )}
            <button onClick={() => { setEditing(null); setEditorOpen(true) }} className="journal-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium"><Plus className="w-3.5 h-3.5" /> New entry</button>
            <div className="relative">
              <button onClick={() => setMenuOpen(v => !v)} className="ml-1">
                <Avatar url={profile?.photoURL || authUser.photoURL} name={profile?.displayName || authUser.displayName || authUser.email} size={32} online={true} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border shadow-lg z-20 overflow-hidden" style={{ background: '#fff', borderColor: 'rgba(128,128,128,0.2)' }}>
                    <div className="px-3 py-3 border-b" style={{ borderColor: 'rgba(128,128,128,0.15)', color: '#1a1a1a' }}>
                      <div className="text-sm font-medium truncate">{profile?.displayName || 'You'}</div>
                      <div className="text-[11px] text-gray-500 truncate">{authUser.email}</div>
                    </div>
                    <button onClick={() => { setMenuOpen(false); setViewingAuthor(authUser.uid) }} className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 flex items-center gap-2" style={{ color: '#1a1a1a' }}><UserIcon className="w-3.5 h-3.5" /> My public profile</button>
                    <button onClick={() => { setMenuOpen(false); setProfileOpen(true) }} className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 flex items-center gap-2" style={{ color: '#1a1a1a' }}><Pencil className="w-3.5 h-3.5" /> Edit profile</button>
                    <div className="h-px" style={{ background: 'rgba(128,128,128,0.15)' }} />
                    {driveConnected ? (
                      <>
                        <button onClick={() => { setMenuOpen(false); doSyncAllToDrive() }} disabled={driveSyncing} className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 flex items-center gap-2 disabled:opacity-50" style={{ color: '#1a1a1a' }}>
                          {driveSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Sync all to Drive
                        </button>
                        <button onClick={() => { setMenuOpen(false); doDisconnectDrive() }} className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 flex items-center gap-2" style={{ color: '#1a1a1a' }}>
                          <CloudOff className="w-3.5 h-3.5" /> Disconnect Drive
                        </button>
                      </>
                    ) : (
                      <button onClick={() => { setMenuOpen(false); doConnectDrive() }} className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 flex items-center gap-2" style={{ color: '#1a1a1a' }}>
                        <Cloud className="w-3.5 h-3.5" /> Connect Google Drive
                      </button>
                    )}
                    <div className="h-px" style={{ background: 'rgba(128,128,128,0.15)' }} />
                    <button onClick={() => { setMenuOpen(false); signOut() }} className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"><LogOut className="w-3.5 h-3.5" /> Sign out</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        {!viewingAuthor && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="flex gap-1 overflow-x-auto">
              <button onClick={() => setTab('mine')} className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 -mb-px ${tab === 'mine' ? 'border-current font-semibold' : 'border-transparent journal-muted'}`}><Feather className="w-3.5 h-3.5" /> My Journal</button>
              <button onClick={() => setTab('following')} className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 -mb-px ${tab === 'following' ? 'border-current font-semibold' : 'border-transparent journal-muted'}`}><UserCheck className="w-3.5 h-3.5" /> Following</button>
              <button onClick={() => setTab('community')} className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 -mb-px ${tab === 'community' ? 'border-current font-semibold' : 'border-transparent journal-muted'}`}><Users className="w-3.5 h-3.5" /> Community</button>
            </div>
          </div>
        )}
        <div className="journal-divider h-px w-full" />
        {envMissing && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-2">
            <div className="rounded-lg p-3 text-sm bg-yellow-50 text-yellow-800 border border-yellow-200">Configuration warning: missing environment variables — {envMissing.join(', ')}. See README for deployment checklist.</div>
          </div>
        )}
      </header>

      {viewingAuthor ? (
        <AuthorView
          uid={viewingAuthor}
          authUser={authUser}
          presence={presence}
          onBack={() => setViewingAuthor(null)}
          onLike={toggleLike}
          onReport={reportPost}
          onView={recordView}
          onCountChange={adjustCommentCount}
        />
      ) : (
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {loading ? (
            <div className="flex items-center justify-center py-24 journal-muted"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
          ) : posts.length === 0 ? (
            tab === 'mine' ? <EmptyMine onStart={() => { setEditing(null); setEditorOpen(true) }} name={profile?.displayName} />
            : tab === 'following' ? <EmptyFollowing onExplore={() => setTab('community')} />
            : <EmptyCommunity onWrite={() => { setEditing(null); setEditorOpen(true) }} />
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
                        key={p.id} post={p}
                        canEdit={p.authorUid === authUser.uid}
                        authUser={authUser} presence={presence}
                        onEdit={post => { setEditing(post); setEditorOpen(true) }}
                        onDelete={deletePost}
                        onLike={toggleLike}
                        onReport={reportPost}
                        onOpenAuthor={uid => setViewingAuthor(uid)}
                        onView={recordView}
                        onCountChange={adjustCommentCount}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          <footer className="mt-20 pt-8 border-t text-center text-xs journal-muted" style={{ borderColor: 'rgba(128,128,128,0.15)' }}>
            <div className="flex items-center justify-center gap-1.5"><Feather className="w-3 h-3" /> <span>Written with intention · The Tani Journal</span></div>
          </footer>
        </main>
      )}

      <PostEditor open={editorOpen} onClose={() => { setEditorOpen(false); setEditing(null) }} onSave={savePost} initial={editing} />
      <StylePanel open={styleOpen} onClose={() => setStyleOpen(false)} theme={theme} setTheme={setTheme} font={font} setFont={setFont} />
      <ProfileEditor open={profileOpen} onClose={() => setProfileOpen(false)} profile={profile} onSave={saveProfile} />
      <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} />

      <button onClick={() => { setEditing(null); setEditorOpen(true) }} className="sm:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg journal-btn-primary flex items-center justify-center z-20">
        <Plus className="w-6 h-6" />
      </button>

      {driveMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-sm font-medium shadow-lg journal-card border inline-flex items-center gap-2 fade-up" style={{ maxWidth: '90vw' }}>
          <Cloud className="w-4 h-4" /> {driveMsg}
        </div>
      )}
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
      <h1 className="text-3xl sm:text-5xl font-semibold mb-3">{name ? `Welcome, ${name.split(' ')[0]}.` : 'Begin your story.'}</h1>
      <p className="journal-muted max-w-md mx-auto mb-8">Every great life is a collection of small, kept moments. Write your first entry, add a photograph — and let the timeline do the rest.</p>
      <button onClick={onStart} className="journal-btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium"><Feather className="w-4 h-4" /> Write your first entry</button>
    </div>
  )
}
function EmptyCommunity({ onWrite }) {
  return (
    <div className="text-center py-16 sm:py-24 fade-up">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6" style={{ background: 'rgba(128,128,128,0.15)' }}><Users className="w-6 h-6" /></div>
      <h1 className="text-2xl sm:text-3xl font-semibold mb-3">The community is quiet.</h1>
      <p className="journal-muted max-w-md mx-auto mb-8">Be the first to share a moment. Mark an entry as <span className="inline-flex items-center gap-1"><Globe className="w-3 h-3" /> Public</span> and it will show up here.</p>
      <button onClick={onWrite} className="journal-btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium"><Feather className="w-4 h-4" /> Share something</button>
    </div>
  )
}
function EmptyFollowing({ onExplore }) {
  return (
    <div className="text-center py-16 sm:py-24 fade-up">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6" style={{ background: 'rgba(128,128,128,0.15)' }}><UserCheck className="w-6 h-6" /></div>
      <h1 className="text-2xl sm:text-3xl font-semibold mb-3">Nothing here yet.</h1>
      <p className="journal-muted max-w-md mx-auto mb-8">Follow writers from the Community to see their entries appear here.</p>
      <button onClick={onExplore} className="journal-btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium"><Users className="w-4 h-4" /> Explore community</button>
    </div>
  )
}

export default App
