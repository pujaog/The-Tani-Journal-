import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { verifyIdTokenFromRequest } from '@/lib/auth-server'
import {
  findOrCreateFolder, upsertPostFile, verifyDriveToken,
} from '@/lib/drive'

const MONGO_URL = process.env.MONGO_URL
const DB_NAME = process.env.DB_NAME || 'tani_journal'
const PRESENCE_WINDOW_MS = 45 * 1000
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

function isAdmin(authUser) {
  if (!authUser?.email) return false
  return ADMIN_EMAILS.includes(authUser.email.toLowerCase())
}

async function createNotification(db, { userUid, actorUid, type, postId, commentId, meta }) {
  if (!userUid || userUid === actorUid) return // don't self-notify
  await db.collection('notifications').insertOne({
    id: uuidv4(),
    userUid, actorUid, type,
    postId: postId || null, commentId: commentId || null,
    meta: meta || null,
    read: false,
    createdAt: new Date().toISOString(),
  })
}

let cachedClient = null
async function getDb() {
  if (cachedClient) return cachedClient.db(DB_NAME)
  const client = new MongoClient(MONGO_URL)
  await client.connect()
  cachedClient = client
  const db = client.db(DB_NAME)
  // Ensure indexes (fire-and-forget)
  db.collection('likes').createIndex({ postId: 1, uid: 1 }, { unique: true }).catch(() => {})
  db.collection('follows').createIndex({ followerUid: 1, followingUid: 1 }, { unique: true }).catch(() => {})
  db.collection('presence').createIndex({ uid: 1 }, { unique: true }).catch(() => {})
  db.collection('comments').createIndex({ postId: 1, createdAt: 1 }).catch(() => {})
  db.collection('posts').createIndex({ authorUid: 1, createdAt: -1 }).catch(() => {})
  db.collection('posts').createIndex({ visibility: 1, createdAt: -1 }).catch(() => {})
  return db
}

const json = (data, status = 200) => NextResponse.json(data, { status })

function clean(doc) {
  if (!doc) return null
  const { _id, ...rest } = doc
  return rest
}
async function readBody(req) { try { return await req.json() } catch { return {} } }

async function ensureProfile(db, authUser) {
  const profiles = db.collection('profiles')
  const existing = await profiles.findOne({ uid: authUser.uid })
  if (existing) return existing
  const now = new Date().toISOString()
  const doc = {
    uid: authUser.uid,
    email: authUser.email,
    displayName: authUser.name || (authUser.email ? authUser.email.split('@')[0] : 'Anonymous'),
    photoURL: authUser.picture || null,
    bio: '',
    createdAt: now,
    updatedAt: now,
  }
  await profiles.insertOne(doc)
  return doc
}

function normalizeMedia(imgs) {
  if (!Array.isArray(imgs)) return []
  return imgs.slice(0, 6).map(im => ({
    url: (im.url || '').toString(),
    aspectRatio: im.aspectRatio === '3:4' ? '3:4' : '16:9',
    type: im.type === 'video' ? 'video' : 'image',
  }))
}

async function attachEngagement(db, posts, authUser) {
  if (!posts.length) return posts
  const postIds = posts.map(p => p.id)
  const authorUids = [...new Set(posts.map(p => p.authorUid).filter(Boolean))]

  const [profDocs, myLikes] = await Promise.all([
    authorUids.length ? db.collection('profiles').find({ uid: { $in: authorUids } }).toArray() : Promise.resolve([]),
    authUser ? db.collection('likes').find({ uid: authUser.uid, postId: { $in: postIds } }).toArray() : Promise.resolve([]),
  ])
  const profMap = Object.fromEntries(profDocs.map(p => [p.uid, {
    uid: p.uid, displayName: p.displayName, photoURL: p.photoURL,
  }]))
  const likedSet = new Set(myLikes.map(l => l.postId))
  return posts.map(p => ({
    ...clean(p),
    author: profMap[p.authorUid] || null,
    likeCount: p.likeCount || 0,
    commentCount: p.commentCount || 0,
    viewCount: p.viewCount || 0,
    likedByMe: likedSet.has(p.id),
  }))
}

async function handle(request, ctx) {
  const params = await ctx.params
  const segs = params?.path || []
  const path = '/' + segs.join('/')
  const method = request.method

  try {
    const db = await getDb()
    const posts = db.collection('posts')
    const profiles = db.collection('profiles')
    const likes = db.collection('likes')
    const comments = db.collection('comments')
    const follows = db.collection('follows')
    const reports = db.collection('reports')
    const presence = db.collection('presence')

    if (path === '/' || path === '/health') {
      return json({ status: 'ok', service: 'tani-journal', time: new Date().toISOString() })
    }

    const authUser = await verifyIdTokenFromRequest(request)

    // Auto-heartbeat: any authed request updates presence lastSeen
    if (authUser) {
      presence.updateOne(
        { uid: authUser.uid },
        { $set: { uid: authUser.uid, lastSeen: new Date().toISOString() } },
        { upsert: true }
      ).catch(() => {})
    }

    // -------- Profile --------
    if (path === '/me' && method === 'GET') {
      if (!authUser) return json({ error: 'Unauthorized' }, 401)
      const prof = await ensureProfile(db, authUser)
      return json({ profile: clean(prof) })
    }
    if (path === '/me' && (method === 'PATCH' || method === 'PUT')) {
      if (!authUser) return json({ error: 'Unauthorized' }, 401)
      await ensureProfile(db, authUser)
      const body = await readBody(request)
      const update = { updatedAt: new Date().toISOString() }
      if (body.displayName !== undefined) update.displayName = String(body.displayName).slice(0, 60)
      if (body.photoURL !== undefined) update.photoURL = body.photoURL ? String(body.photoURL) : null
      if (body.bio !== undefined) update.bio = String(body.bio).slice(0, 280)
      const res = await profiles.findOneAndUpdate({ uid: authUser.uid }, { $set: update }, { returnDocument: 'after' })
      const doc = res?.value || res
      return json({ profile: clean(doc) })
    }
    if (segs[0] === 'profiles' && segs[1] && !segs[2] && method === 'GET') {
      const prof = await profiles.findOne({ uid: segs[1] })
      if (!prof) return json({ error: 'Not found' }, 404)
      const [postCount, followerCount, followingCount, isFollowing] = await Promise.all([
        posts.countDocuments({ authorUid: segs[1], visibility: 'public' }),
        follows.countDocuments({ followingUid: segs[1] }),
        follows.countDocuments({ followerUid: segs[1] }),
        authUser ? follows.countDocuments({ followerUid: authUser.uid, followingUid: segs[1] }) : Promise.resolve(0),
      ])
      return json({
        profile: clean(prof),
        stats: { postCount, followerCount, followingCount },
        isFollowing: isFollowing > 0,
      })
    }
    if (segs[0] === 'profiles' && segs[1] && segs[2] === 'posts' && method === 'GET') {
      // Public posts by this author
      const list = await posts.find({ authorUid: segs[1], visibility: 'public' }).sort({ createdAt: -1 }).limit(200).toArray()
      const enriched = await attachEngagement(db, list, authUser)
      return json({ posts: enriched })
    }

    // -------- Posts feed --------
    if (path === '/posts' && method === 'GET') {
      const url = new URL(request.url)
      const scope = url.searchParams.get('scope') || 'community'
      let filter
      if (scope === 'mine') {
        if (!authUser) return json({ error: 'Unauthorized' }, 401)
        filter = { authorUid: authUser.uid }
      } else if (scope === 'following') {
        if (!authUser) return json({ error: 'Unauthorized' }, 401)
        const followed = await follows.find({ followerUid: authUser.uid }).toArray()
        const uids = followed.map(f => f.followingUid)
        if (uids.length === 0) return json({ posts: [] })
        filter = { authorUid: { $in: uids }, visibility: 'public' }
      } else {
        filter = { visibility: 'public' }
      }
      const list = await posts.find(filter).sort({ createdAt: -1 }).limit(200).toArray()
      const enriched = await attachEngagement(db, list, authUser)
      return json({ posts: enriched })
    }

    if (path === '/posts' && method === 'POST') {
      if (!authUser) return json({ error: 'Unauthorized' }, 401)
      await ensureProfile(db, authUser)
      const body = await readBody(request)
      const now = new Date().toISOString()
      const doc = {
        id: uuidv4(),
        authorUid: authUser.uid,
        title: (body.title || '').toString().slice(0, 200),
        content: (body.content || '').toString(),
        mood: (body.mood || '').toString().slice(0, 40),
        images: normalizeMedia(body.images),
        visibility: body.visibility === 'public' ? 'public' : 'private',
        likeCount: 0,
        commentCount: 0,
        viewCount: 0,
        viewerUids: [],
        createdAt: now,
        updatedAt: now,
      }
      await posts.insertOne(doc)
      const enriched = await attachEngagement(db, [doc], authUser)
      return json({ post: enriched[0] }, 201)
    }

    // /posts/:id/*
    if (segs[0] === 'posts' && segs[1]) {
      const id = segs[1]
      const sub = segs[2]

      if (!sub) {
        if (method === 'GET') {
          const doc = await posts.findOne({ id })
          if (!doc) return json({ error: 'Not found' }, 404)
          if (doc.visibility !== 'public' && (!authUser || authUser.uid !== doc.authorUid)) {
            return json({ error: 'Forbidden' }, 403)
          }
          const enriched = await attachEngagement(db, [doc], authUser)
          return json({ post: enriched[0] })
        }
        if (method === 'PUT' || method === 'PATCH') {
          if (!authUser) return json({ error: 'Unauthorized' }, 401)
          const existing = await posts.findOne({ id })
          if (!existing) return json({ error: 'Not found' }, 404)
          if (existing.authorUid !== authUser.uid) return json({ error: 'Forbidden' }, 403)
          const body = await readBody(request)
          const update = { updatedAt: new Date().toISOString() }
          if (body.title !== undefined) update.title = String(body.title).slice(0, 200)
          if (body.content !== undefined) update.content = String(body.content)
          if (body.mood !== undefined) update.mood = String(body.mood).slice(0, 40)
          if (Array.isArray(body.images)) update.images = normalizeMedia(body.images)
          if (body.visibility !== undefined) update.visibility = body.visibility === 'public' ? 'public' : 'private'
          const res = await posts.findOneAndUpdate({ id }, { $set: update }, { returnDocument: 'after' })
          const doc = res?.value || res
          const enriched = await attachEngagement(db, [doc], authUser)
          return json({ post: enriched[0] })
        }
        if (method === 'DELETE') {
          if (!authUser) return json({ error: 'Unauthorized' }, 401)
          const existing = await posts.findOne({ id })
          if (!existing) return json({ error: 'Not found' }, 404)
          if (existing.authorUid !== authUser.uid) return json({ error: 'Forbidden' }, 403)
          await Promise.all([
            posts.deleteOne({ id }),
            likes.deleteMany({ postId: id }),
            comments.deleteMany({ postId: id }),
            reports.deleteMany({ postId: id }),
          ])
          return json({ ok: true })
        }
      }

      // /posts/:id/like
      if (sub === 'like' && method === 'POST') {
        if (!authUser) return json({ error: 'Unauthorized' }, 401)
        const p = await posts.findOne({ id })
        if (!p) return json({ error: 'Not found' }, 404)
        const existing = await likes.findOne({ postId: id, uid: authUser.uid })
        if (existing) {
          await likes.deleteOne({ postId: id, uid: authUser.uid })
          await posts.updateOne({ id }, { $inc: { likeCount: -1 } })
          const updated = await posts.findOne({ id })
          return json({ liked: false, likeCount: Math.max(0, updated.likeCount || 0) })
        } else {
          await likes.insertOne({ id: uuidv4(), postId: id, uid: authUser.uid, createdAt: new Date().toISOString() })
          await posts.updateOne({ id }, { $inc: { likeCount: 1 } })
          const updated = await posts.findOne({ id })
          createNotification(db, {
            userUid: p.authorUid, actorUid: authUser.uid, type: 'like', postId: id,
            meta: { postTitle: p.title },
          }).catch(() => {})
          return json({ liked: true, likeCount: updated.likeCount || 0 })
        }
      }

      // /posts/:id/view
      if (sub === 'view' && method === 'POST') {
        const p = await posts.findOne({ id })
        if (!p) return json({ error: 'Not found' }, 404)
        if (p.visibility !== 'public' && (!authUser || authUser.uid !== p.authorUid)) {
          return json({ error: 'Forbidden' }, 403)
        }
        if (authUser) {
          // Dedupe: only count if not already in viewerUids
          const already = (p.viewerUids || []).includes(authUser.uid)
          if (!already && authUser.uid !== p.authorUid) {
            await posts.updateOne({ id }, { $addToSet: { viewerUids: authUser.uid }, $inc: { viewCount: 1 } })
          }
        } else {
          await posts.updateOne({ id }, { $inc: { viewCount: 1 } })
        }
        const updated = await posts.findOne({ id })
        return json({ viewCount: updated.viewCount || 0 })
      }

      // /posts/:id/comments
      if (sub === 'comments') {
        // For POST, require auth first (before revealing whether post exists)
        if (method === 'POST' && !authUser) return json({ error: 'Unauthorized' }, 401)
        const p = await posts.findOne({ id })
        if (!p) return json({ error: 'Not found' }, 404)
        if (p.visibility !== 'public' && (!authUser || authUser.uid !== p.authorUid)) {
          return json({ error: 'Forbidden' }, 403)
        }
        if (method === 'GET') {
          const list = await comments.find({ postId: id }).sort({ createdAt: 1 }).limit(500).toArray()
          const uids = [...new Set(list.map(c => c.authorUid))]
          const authors = uids.length ? await profiles.find({ uid: { $in: uids } }).toArray() : []
          const map = Object.fromEntries(authors.map(a => [a.uid, { uid: a.uid, displayName: a.displayName, photoURL: a.photoURL }]))
          return json({ comments: list.map(c => ({ ...clean(c), author: map[c.authorUid] || null })) })
        }
        if (method === 'POST') {
          if (!authUser) return json({ error: 'Unauthorized' }, 401)
          await ensureProfile(db, authUser)
          const body = await readBody(request)
          const content = String(body.content || '').trim().slice(0, 1000)
          if (!content) return json({ error: 'Content required' }, 400)
          const doc = {
            id: uuidv4(),
            postId: id,
            authorUid: authUser.uid,
            content,
            createdAt: new Date().toISOString(),
          }
          await comments.insertOne(doc)
          await posts.updateOne({ id }, { $inc: { commentCount: 1 } })
          createNotification(db, {
            userUid: p.authorUid, actorUid: authUser.uid, type: 'comment',
            postId: id, commentId: doc.id, meta: { postTitle: p.title, snippet: content.slice(0, 100) },
          }).catch(() => {})
          const author = await profiles.findOne({ uid: authUser.uid })
          return json({ comment: { ...clean(doc), author: author ? { uid: author.uid, displayName: author.displayName, photoURL: author.photoURL } : null } }, 201)
        }
      }

      // /posts/:id/report
      if (sub === 'report' && method === 'POST') {
        if (!authUser) return json({ error: 'Unauthorized' }, 401)
        const p = await posts.findOne({ id })
        if (!p) return json({ error: 'Not found' }, 404)
        const body = await readBody(request)
        const reason = String(body.reason || '').slice(0, 500)
        const existing = await reports.findOne({ postId: id, reporterUid: authUser.uid })
        if (existing) return json({ ok: true, alreadyReported: true })
        await reports.insertOne({
          id: uuidv4(), postId: id, authorUid: p.authorUid, reporterUid: authUser.uid,
          reason, status: 'open', createdAt: new Date().toISOString(),
        })
        return json({ ok: true })
      }
    }

    // /comments/:id
    if (segs[0] === 'comments' && segs[1] && method === 'DELETE') {
      if (!authUser) return json({ error: 'Unauthorized' }, 401)
      const c = await comments.findOne({ id: segs[1] })
      if (!c) return json({ error: 'Not found' }, 404)
      if (c.authorUid !== authUser.uid) return json({ error: 'Forbidden' }, 403)
      await comments.deleteOne({ id: segs[1] })
      await posts.updateOne({ id: c.postId }, { $inc: { commentCount: -1 } })
      return json({ ok: true })
    }
    if (segs[0] === 'comments' && segs[1] && (method === 'PUT' || method === 'PATCH')) {
      if (!authUser) return json({ error: 'Unauthorized' }, 401)
      const c = await comments.findOne({ id: segs[1] })
      if (!c) return json({ error: 'Not found' }, 404)
      if (c.authorUid !== authUser.uid) return json({ error: 'Forbidden' }, 403)
      const body = await readBody(request)
      const content = String(body.content || '').trim().slice(0, 1000)
      if (!content) return json({ error: 'Content required' }, 400)
      const updated = await comments.findOneAndUpdate(
        { id: segs[1] },
        { $set: { content, updatedAt: new Date().toISOString() } },
        { returnDocument: 'after' }
      )
      const doc = updated?.value || updated
      const author = await profiles.findOne({ uid: c.authorUid })
      return json({ comment: { ...clean(doc), author: author ? { uid: author.uid, displayName: author.displayName, photoURL: author.photoURL } : null } })
    }

    // -------- Follows --------
    if (segs[0] === 'follow' && segs[1] && method === 'POST') {
      if (!authUser) return json({ error: 'Unauthorized' }, 401)
      const targetUid = segs[1]
      if (targetUid === authUser.uid) return json({ error: 'Cannot follow yourself' }, 400)
      const existing = await follows.findOne({ followerUid: authUser.uid, followingUid: targetUid })
      if (existing) {
        await follows.deleteOne({ followerUid: authUser.uid, followingUid: targetUid })
        return json({ following: false })
      }
      await follows.insertOne({
        id: uuidv4(), followerUid: authUser.uid, followingUid: targetUid,
        createdAt: new Date().toISOString(),
      })
      createNotification(db, { userUid: targetUid, actorUid: authUser.uid, type: 'follow' }).catch(() => {})
      return json({ following: true })
    }
    if (path === '/follows' && method === 'GET') {
      if (!authUser) return json({ error: 'Unauthorized' }, 401)
      const list = await follows.find({ followerUid: authUser.uid }).toArray()
      return json({ following: list.map(f => f.followingUid) })
    }

    // -------- Presence --------
    if (path === '/heartbeat' && method === 'POST') {
      if (!authUser) return json({ error: 'Unauthorized' }, 401)
      await presence.updateOne(
        { uid: authUser.uid },
        { $set: { uid: authUser.uid, lastSeen: new Date().toISOString() } },
        { upsert: true }
      )
      return json({ ok: true, time: new Date().toISOString() })
    }
    if (path === '/presence' && method === 'GET') {
      const url = new URL(request.url)
      const uidsParam = url.searchParams.get('uids') || ''
      const uids = uidsParam.split(',').map(s => s.trim()).filter(Boolean)
      if (uids.length === 0) return json({ presence: {} })
      const rows = await presence.find({ uid: { $in: uids } }).toArray()
      const now = Date.now()
      const map = {}
      for (const u of uids) map[u] = false
      for (const r of rows) {
        const t = new Date(r.lastSeen).getTime()
        if (now - t < PRESENCE_WINDOW_MS) map[r.uid] = true
      }
      return json({ presence: map })
    }

    // -------- Notifications --------
    if (path === '/notifications' && method === 'GET') {
      if (!authUser) return json({ error: 'Unauthorized' }, 401)
      const list = await db.collection('notifications')
        .find({ userUid: authUser.uid })
        .sort({ createdAt: -1 }).limit(50).toArray()
      const actorUids = [...new Set(list.map(n => n.actorUid).filter(Boolean))]
      const actors = actorUids.length ? await profiles.find({ uid: { $in: actorUids } }).toArray() : []
      const actorMap = Object.fromEntries(actors.map(a => [a.uid, { uid: a.uid, displayName: a.displayName, photoURL: a.photoURL }]))
      const unread = await db.collection('notifications').countDocuments({ userUid: authUser.uid, read: false })
      return json({
        notifications: list.map(n => ({ ...clean(n), actor: actorMap[n.actorUid] || null })),
        unread,
      })
    }
    if (path === '/notifications/read' && method === 'POST') {
      if (!authUser) return json({ error: 'Unauthorized' }, 401)
      await db.collection('notifications').updateMany({ userUid: authUser.uid, read: false }, { $set: { read: true } })
      return json({ ok: true })
    }

    // -------- Search --------
    if (path === '/search' && method === 'GET') {
      const url = new URL(request.url)
      const q = url.searchParams.get('q') || ''
      if (!q || q.length < 2) return json({ posts: [] })
      const queryRegex = new RegExp(q, 'i')
      const list = await posts.find({
        visibility: 'public',
        $or: [
          { title: queryRegex },
          { content: queryRegex },
          { mood: queryRegex }
        ]
      }).sort({ createdAt: -1 }).limit(100).toArray()
      const enriched = await attachEngagement(db, list, authUser)
      return json({ posts: enriched })
    }

    // -------- Admin --------
    if (path === '/admin/status' && method === 'GET') {
      if (!authUser) return json({ error: 'Unauthorized' }, 401)
      return json({ isAdmin: isAdmin(authUser) })
    }
    if (path === '/admin/reports' && method === 'GET') {
      if (!authUser) return json({ error: 'Unauthorized' }, 401)
      if (!isAdmin(authUser)) return json({ error: 'Forbidden' }, 403)
      const list = await reports.find({}).sort({ createdAt: -1 }).limit(200).toArray()
      const postIds = [...new Set(list.map(r => r.postId))]
      const uids = [...new Set([...list.map(r => r.reporterUid), ...list.map(r => r.authorUid)])]
      const [pDocs, uDocs] = await Promise.all([
        postIds.length ? posts.find({ id: { $in: postIds } }).toArray() : [],
        uids.length ? profiles.find({ uid: { $in: uids } }).toArray() : [],
      ])
      const pMap = Object.fromEntries(pDocs.map(p => [p.id, clean(p)]))
      const uMap = Object.fromEntries(uDocs.map(u => [u.uid, { uid: u.uid, displayName: u.displayName, photoURL: u.photoURL }]))
      return json({
        reports: list.map(r => ({
          ...clean(r),
          post: pMap[r.postId] || null,
          reporter: uMap[r.reporterUid] || null,
          author: uMap[r.authorUid] || null,
        })),
      })
    }
    if (segs[0] === 'admin' && segs[1] === 'reports' && segs[2] && segs[3] === 'resolve' && method === 'POST') {
      if (!authUser) return json({ error: 'Unauthorized' }, 401)
      if (!isAdmin(authUser)) return json({ error: 'Forbidden' }, 403)
      const body = await readBody(request)
      await reports.updateOne({ id: segs[2] }, { $set: { status: 'resolved', resolvedAt: new Date().toISOString(), resolvedBy: authUser.uid, note: body.note || '' } })
      return json({ ok: true })
    }
    if (segs[0] === 'admin' && segs[1] === 'posts' && segs[2] && method === 'DELETE') {
      if (!authUser) return json({ error: 'Unauthorized' }, 401)
      if (!isAdmin(authUser)) return json({ error: 'Forbidden' }, 403)
      const id = segs[2]
      await Promise.all([
        posts.deleteOne({ id }),
        likes.deleteMany({ postId: id }),
        comments.deleteMany({ postId: id }),
        reports.updateMany({ postId: id }, { $set: { status: 'resolved', resolvedAt: new Date().toISOString(), resolvedBy: authUser.uid, note: 'Post removed by admin' } }),
      ])
      return json({ ok: true })
    }

    // -------- Upload echo --------
    if (path === '/upload' && method === 'POST') {
      const body = await readBody(request)
      if (!body.dataUrl) return json({ error: 'dataUrl required' }, 400)
      return json({ url: body.dataUrl })
    }

    // -------- Drive integration --------
    // POST /drive/verify - client sends {accessToken}, we ping Drive and return ok
    if (path === '/drive/verify' && method === 'POST') {
      if (!authUser) return json({ error: 'Unauthorized' }, 401)
      const body = await readBody(request)
      const token = body.accessToken
      if (!token) return json({ error: 'accessToken required' }, 400)
      const ok = await verifyDriveToken(token)
      if (!ok) return json({ error: 'Invalid or expired Drive token' }, 401)
      return json({ ok: true })
    }

    // POST /drive/sync-all - sync all of my posts (private + public)
    if (path === '/drive/sync-all' && method === 'POST') {
      if (!authUser) return json({ error: 'Unauthorized' }, 401)
      const token = request.headers.get('x-drive-token') || (await readBody(request)).accessToken
      if (!token) return json({ error: 'Drive token required (X-Drive-Token header)' }, 400)
      try {
        const folderId = await findOrCreateFolder(token)
        const mine = await posts.find({ authorUid: authUser.uid }).sort({ createdAt: 1 }).toArray()
        const results = []
        for (const p of mine) {
          try {
            const r = await upsertPostFile(token, folderId, p)
            results.push({ id: p.id, ...r })
          } catch (e) {
            results.push({ id: p.id, error: String(e?.message || e) })
          }
        }
        return json({ ok: true, folderId, syncedCount: results.filter(r => !r.error).length, total: mine.length, results })
      } catch (err) {
        console.error('Drive sync-all failed:', err)
        const status = err?.status === 401 ? 401 : 500
        return json({ error: 'Drive sync failed', detail: String(err?.message || err) }, status)
      }
    }

    // POST /drive/sync/:postId - sync one post (used on create/update)
    if (segs[0] === 'drive' && segs[1] === 'sync' && segs[2] && method === 'POST') {
      if (!authUser) return json({ error: 'Unauthorized' }, 401)
      const token = request.headers.get('x-drive-token') || (await readBody(request)).accessToken
      if (!token) return json({ error: 'Drive token required' }, 400)
      const p = await posts.findOne({ id: segs[2] })
      if (!p) return json({ error: 'Not found' }, 404)
      if (p.authorUid !== authUser.uid) return json({ error: 'Forbidden' }, 403)
      try {
        const folderId = await findOrCreateFolder(token)
        const r = await upsertPostFile(token, folderId, p)
        return json({ ok: true, ...r })
      } catch (err) {
        const status = err?.status === 401 ? 401 : 500
        return json({ error: 'Drive sync failed', detail: String(err?.message || err) }, status)
      }
    }

    return json({ error: 'Not found', path, method }, 404)
  } catch (err) {
    console.error('API error:', err)
    return json({ error: 'Server error', detail: String(err?.message || err) }, 500)
  }
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
