// Lightweight Google Drive v3 REST client — no SDK needed.

const FOLDER_NAME = 'The Tani Journal'
const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3'

function authHeader(token) {
  return { Authorization: `Bearer ${token}` }
}

async function driveFetch(token, url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...authHeader(token), ...(options.headers || {}) },
  })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { /* ignore */ }
  if (!res.ok) {
    const msg = data?.error?.message || text || `HTTP ${res.status}`
    const err = new Error(msg)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export async function verifyDriveToken(accessToken) {
  try {
    await driveFetch(accessToken, `${DRIVE_API}/about?fields=user(emailAddress,displayName)`)
    return true
  } catch { return false }
}

export async function findOrCreateFolder(accessToken) {
  const q = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`)
  const list = await driveFetch(accessToken, `${DRIVE_API}/files?q=${q}&fields=files(id,name)&spaces=drive`)
  if (list?.files?.length > 0) return list.files[0].id
  const created = await driveFetch(accessToken, `${DRIVE_API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  })
  return created.id
}

function escapeQ(s) { return String(s).replace(/'/g, "\\'") }

export function postToMarkdown(post) {
  const lines = []
  lines.push('---')
  lines.push(`id: ${post.id}`)
  lines.push(`title: "${(post.title || '').replace(/"/g, '\\"')}"`)
  lines.push(`createdAt: ${post.createdAt}`)
  lines.push(`updatedAt: ${post.updatedAt || post.createdAt}`)
  if (post.mood) lines.push(`mood: "${post.mood}"`)
  lines.push(`visibility: ${post.visibility}`)
  lines.push('---')
  lines.push('')
  lines.push(`# ${post.title}`)
  lines.push('')
  if (post.content) { lines.push(post.content); lines.push('') }
  if (post.images && post.images.length) {
    lines.push('## Media')
    for (const im of post.images) {
      const isVideo = im.type === 'video'
      const label = `${isVideo ? 'Video' : 'Image'} (${im.aspectRatio})`
      if (im.url && im.url.startsWith('data:')) {
        lines.push(`- ${label} — embedded (${(im.url.length / 1024).toFixed(0)}KB)`)
      } else if (im.url) {
        lines.push(`![${label}](${im.url})`)
      }
    }
  }
  return lines.join('\n')
}

export function makeFilename(post) {
  const date = (post.createdAt || new Date().toISOString()).slice(0, 10)
  const slug = (post.title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'untitled'
  return `${date}-${slug}-${post.id.slice(0, 8)}.md`
}

async function findFileInFolder(accessToken, folderId, fileName) {
  const q = encodeURIComponent(`'${folderId}' in parents and name='${escapeQ(fileName)}' and trashed=false`)
  const list = await driveFetch(accessToken, `${DRIVE_API}/files?q=${q}&fields=files(id,name)&spaces=drive`)
  return list?.files?.[0] || null
}

// Multipart upload for create; PATCH with media for update
async function multipartCreate(accessToken, metadata, contentString) {
  const boundary = '-------tani' + Math.random().toString(36).slice(2)
  const delim = `--${boundary}\r\n`
  const closeDelim = `\r\n--${boundary}--`
  const body =
    delim +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    '\r\n' +
    delim +
    'Content-Type: text/markdown; charset=UTF-8\r\n\r\n' +
    contentString +
    closeDelim
  return driveFetch(accessToken, `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id,webViewLink`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  })
}

async function updateFileContent(accessToken, fileId, contentString) {
  return driveFetch(accessToken, `${DRIVE_UPLOAD}/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'text/markdown; charset=UTF-8' },
    body: contentString,
  })
}

export async function upsertPostFile(accessToken, folderId, post) {
  const fileName = makeFilename(post)
  const content = postToMarkdown(post)
  const existing = await findFileInFolder(accessToken, folderId, fileName)
  if (existing) {
    await updateFileContent(accessToken, existing.id, content)
    return { fileId: existing.id, fileName, action: 'updated' }
  }
  const created = await multipartCreate(accessToken, { name: fileName, parents: [folderId] }, content)
  return { fileId: created.id, fileName, action: 'created' }
}

export async function deletePostFile(accessToken, folderId, post) {
  const fileName = makeFilename(post)
  const existing = await findFileInFolder(accessToken, folderId, fileName)
  if (!existing) return { deleted: false }
  await driveFetch(accessToken, `${DRIVE_API}/files/${existing.id}`, { method: 'DELETE' })
  return { deleted: true }
}
