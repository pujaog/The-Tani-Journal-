'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AudioLines, Bell, Camera, Check, ChevronDown, CircleUserRound, Headphones,
  Info, Mic, MicOff, MoreHorizontal, Paperclip, Phone, Pin, Plus, Search,
  Send, Settings2, Sparkles, Star, UserPlus, Video, VideoOff, Volume2, X
} from 'lucide-react'

const PEOPLE = [
  { id: 'maya', name: 'Maya Chen', role: 'Design partner', initials: 'MC', color: '#ff8d70', status: 'In a focus session', unread: 2, last: 'The new direction feels alive.' },
  { id: 'sam', name: 'Sam Rivera', role: 'Product studio', initials: 'SR', color: '#7dd3c7', status: 'Online now', unread: 0, last: 'Can you review the launch notes?' },
  { id: 'noor', name: 'Noor Patel', role: 'Research circle', initials: 'NP', color: '#b9a0ff', status: 'Away for 12m', unread: 0, last: 'Voice note · 0:42' },
  { id: 'team', name: 'Orbit team', role: '4 members', initials: 'OT', color: '#f2c96d', status: '3 active now', unread: 4, last: 'Ari shared a new room' },
]

const SEED_MESSAGES = [
  { id: 1, from: 'maya', text: 'I mapped the first pass of the constellation. It feels less like a dashboard and more like a place to think together.', time: '9:41 AM' },
  { id: 2, from: 'me', text: 'That is exactly the feeling. Let’s keep the room quiet and let the important things float forward.', time: '9:44 AM' },
  { id: 3, from: 'maya', text: 'The new direction feels alive.', time: '9:46 AM', reaction: '✦' },
]

function Avatar({ person, size = 'md', online = false }) {
  return <span className={`avatar avatar-${size}`} style={{ '--avatar-color': person.color }}>
    {person.initials}
    {online && <i className="presence-dot" />}
  </span>
}

function OrbitalScene({ callActive, onJoin }) {
  return <section className={`orbital-scene ${callActive ? 'orbital-scene-live' : ''}`} aria-label="3D shared space">
    <div className="scene-label"><span className="live-pulse" /> Shared space <span>•</span> Maya’s orbit</div>
    <div className="scene-grid" />
    <div className="scene-horizon" />
    <div className="orbit orbit-one" />
    <div className="orbit orbit-two" />
    <div className="orbit orbit-three" />
    <div className="core-planet"><div className="planet-ring" /><div className="planet-glow" /><span>03</span></div>
    <div className="floating-note note-one"><Pin size={13} /> Product north star</div>
    <div className="floating-note note-two"><Sparkles size={13} /> Good energy here</div>
    <div className="floating-person person-one"><Avatar person={PEOPLE[0]} size="sm" online /><span>Maya</span></div>
    <div className="floating-person person-two"><Avatar person={PEOPLE[2]} size="sm" /><span>Noor</span></div>
    <div className="scene-copy"><p>SPACE 03</p><h2>Ideas in orbit.</h2><span>A live room for the conversations that move work forward.</span></div>
    {callActive && <div className="call-badge"><Video size={14} /> Live room · 03:18</div>}
    <button className="join-scene" onClick={onJoin}>{callActive ? 'Open live room' : 'Join the space'} <span>↗</span></button>
  </section>
}

function App() {
  const [selectedId, setSelectedId] = useState('maya')
  const [messages, setMessages] = useState(SEED_MESSAGES)
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [callType, setCallType] = useState(null)
  const [muted, setMuted] = useState(false)
  const [cameraOn, setCameraOn] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [notice, setNotice] = useState('')
  const inputRef = useRef(null)
  const selected = PEOPLE.find(person => person.id === selectedId) || PEOPLE[0]
  const filteredPeople = useMemo(() => PEOPLE.filter(person => `${person.name} ${person.role}`.toLowerCase().includes(search.toLowerCase())), [search])

  useEffect(() => { document.documentElement.dataset.theme = darkMode ? 'night' : 'light' }, [darkMode])

  const showNotice = (text) => {
    setNotice(text)
    window.setTimeout(() => setNotice(''), 2400)
  }
  const sendMessage = () => {
    const text = draft.trim()
    if (!text) return
    setMessages(current => [...current, { id: Date.now(), from: 'me', text, time: 'now' }])
    setDraft('')
  }
  const startCall = (type) => { setCallType(type); showNotice(`${type === 'video' ? 'Video' : 'Audio'} room ready for ${selected.name}`) }

  return <main className="orbit-app">
    <aside className="app-sidebar">
      <div className="brand-lockup"><div className="brand-mark"><span /><span /><span /></div><div><strong>orbit</strong><small>conversations, in 3D</small></div></div>
      <button className="new-room" onClick={() => showNotice('A new room is ready to name')}><Plus size={17} /> New room <span>⌘ N</span></button>
      <nav className="side-nav"><p className="eyebrow">Workspace</p><button className="nav-active"><span className="nav-orbit">◉</span> All conversations <b>12</b></button><button onClick={() => showNotice('Pinned conversations opened')}><Star size={16} /> Pinned <b>3</b></button><button onClick={() => showNotice('Your notes opened')}><Sparkles size={16} /> My notes</button></nav>
      <div className="people-heading"><p className="eyebrow">People & rooms</p><button aria-label="Add person" onClick={() => showNotice('Invite link copied')}><UserPlus size={15} /></button></div>
      <div className="people-list">{filteredPeople.map(person => <button key={person.id} className={`person-row ${person.id === selectedId ? 'person-row-active' : ''}`} onClick={() => setSelectedId(person.id)}><Avatar person={person} online={person.id === 'maya' || person.id === 'team'} /><span className="person-meta"><strong>{person.name}</strong><small>{person.last}</small></span>{person.unread > 0 && <b className="unread">{person.unread}</b>}</button>)}</div>
      <div className="sidebar-footer"><button onClick={() => showNotice('Settings opened')}><Settings2 size={16} /> Settings</button><button onClick={() => showNotice('Your profile opened')}><CircleUserRound size={16} /> Jordan Lee <ChevronDown size={14} /></button></div>
    </aside>

    <section className="workspace">
      <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>All conversations</strong></div><div className="top-actions"><label className="search-box"><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search orbit" /><kbd>⌘ K</kbd></label><button className="icon-button" aria-label="Notifications" onClick={() => showNotice('No new notifications')}><Bell size={18} /><i /></button><button className="avatar avatar-sm profile-avatar" onClick={() => showNotice('Profile menu opened')}>JL</button></div></header>
      <div className="workspace-body">
        <div className="conversation-column">
          <div className="conversation-heading"><div><p className="eyebrow">Conversation</p><h1>{selected.name}</h1><p><span className="status-dot" /> {selected.status}</p></div><div className="conversation-actions"><button className="circle-action" aria-label="Start audio call" onClick={() => startCall('audio')}><Phone size={17} /></button><button className="circle-action call-primary" aria-label="Start video call" onClick={() => startCall('video')}><Video size={17} /></button><button className="circle-action" aria-label="More options" onClick={() => showNotice('Conversation options opened')}><MoreHorizontal size={18} /></button></div></div>
          <div className="message-stream"><div className="day-divider"><span>Today, September 5</span></div><div className="message-note"><Info size={14} /> Messages are end-to-end encrypted <span>·</span> <button onClick={() => showNotice('Privacy details opened')}>Details</button></div>
            {messages.map(message => { const isMe = message.from === 'me'; const person = isMe ? { initials: 'JL', color: '#ef765f' } : selected; return <div className={`message-row ${isMe ? 'message-row-me' : ''}`} key={message.id}><Avatar person={person} size="sm" /><div className="message-content"><div className="message-author"><strong>{isMe ? 'You' : selected.name}</strong><span>{message.time}</span></div><div className="message-bubble">{message.text}{message.reaction && <button className="message-reaction" onClick={() => showNotice('Reaction added')}>{message.reaction} 1</button>}</div></div></div> })}
          </div>
          <div className="composer-wrap"><div className="composer"><button aria-label="Attach a file" onClick={() => showNotice('Attachment picker opened')}><Paperclip size={17} /></button><input ref={inputRef} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') sendMessage() }} placeholder={`Message ${selected.name.split(' ')[0]}...`} /><button aria-label="Voice message" onClick={() => showNotice('Hold to record a voice note')}><AudioLines size={17} /></button><button className="send-button" aria-label="Send message" onClick={sendMessage}><Send size={16} /></button></div><div className="composer-hint"><span>Press <kbd>Enter</kbd> to send</span><span><span className="secure-dot" /> Private room</span></div></div>
        </div>
        <aside className="right-rail"><OrbitalScene callActive={Boolean(callType)} onJoin={() => startCall('video')} /><div className="rail-section"><div className="rail-heading"><span><Headphones size={16} /> Quick huddle</span><button onClick={() => showNotice('Huddle history opened')}>History</button></div><div className="huddle-card"><div className="huddle-avatars"><Avatar person={PEOPLE[0]} size="sm" online /><Avatar person={PEOPLE[1]} size="sm" online /><Avatar person={PEOPLE[2]} size="sm" /></div><div><strong>Orbit team stand-up</strong><small>3 people · 18 min ago</small></div><button onClick={() => startCall('audio')} aria-label="Join audio huddle"><Phone size={15} /></button></div></div><div className="rail-section"><div className="rail-heading"><span><Pin size={16} /> Shared notes</span><button onClick={() => showNotice('Notes opened')}>See all</button></div><button className="shared-note" onClick={() => { setDraft('I added a thought to the north star note.'); inputRef.current?.focus() }}><span className="note-icon"><Sparkles size={15} /></span><span><strong>The north star</strong><small>Last edited 4m ago by Maya</small></span><ChevronDown size={15} /></button></div></aside>
      </div>
    </section>

    <button className="journal-chip theme-toggle" onClick={() => setDarkMode(value => !value)} aria-label="toggle theme">{darkMode ? 'Light' : 'Night'} <span>◐</span></button>
    {notice && <div className="toast"><Check size={16} /> {notice}</div>}
    {callType && <div className="call-overlay"><div className="call-window"><div className="call-window-top"><span><span className="live-pulse" /> {callType === 'video' ? 'Video call' : 'Audio call'}</span><button aria-label="Close call" onClick={() => setCallType(null)}><X size={18} /></button></div>{callType === 'video' ? <div className="video-stage"><div className="video-silhouette"><Avatar person={selected} size="xl" online /><strong>{selected.name}</strong><small>Connecting securely...</small></div><div className="self-preview"><span>JL</span><small>{cameraOn ? 'You' : 'Camera off'}</small></div></div> : <div className="audio-stage"><div className="audio-rings"><div /><div /><div /><Avatar person={selected} size="xl" online /></div><h2>{selected.name}</h2><p>Connecting securely...</p></div>}<div className="call-controls"><button onClick={() => setMuted(value => !value)} className={muted ? 'control-active' : ''}>{muted ? <MicOff size={18} /> : <Mic size={18} />}</button>{callType === 'video' && <button onClick={() => setCameraOn(value => !value)} className={!cameraOn ? 'control-active' : ''}>{cameraOn ? <Camera size={18} /> : <VideoOff size={18} />}</button>}<button className="end-call" onClick={() => setCallType(null)}><Phone size={19} /></button><button onClick={() => showNotice('Speaker selected')}><Volume2 size={18} /></button></div></div></div>}
  </main>
}

export default App
