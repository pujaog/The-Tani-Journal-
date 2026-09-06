export type DrivePost = {
  id: string
  title: string
  excerpt: string
  content: string
  tags: string[]
  status: 'draft' | 'published'
  authorId: string
  createdAt: string
  updatedAt: string
}

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'
const FOLDER_NAME = 'The Tani Journal Posts'

async function request<T>(token: string, url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
  })
  if (!response.ok) throw new Error(`Google Drive request failed (${response.status})`)
  return response.status === 204 ? null as T : response.json() as Promise<T>
}

function quote(value: string) {
  return value.replace(/'/g, "\\'")
}

export async function findOrCreateFolder(accessToken: string) {
  const query = encodeURIComponent(`name='${quote(FOLDER_NAME)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`)
  const existing = await request<{ files?: { id: string }[] }>(accessToken, `${DRIVE_API}/files?q=${query}&fields=files(id)&spaces=drive`)
  if (existing.files?.[0]?.id) return existing.files[0].id
  const created = await request<{ id: string }>(accessToken, `${DRIVE_API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  })
  return created.id
}

async function upload(accessToken: string, folderId: string, post: DrivePost, fileId?: string) {
  const metadata = { name: `${post.id}.json`, mimeType: 'application/json', ...(fileId ? {} : { parents: [folderId] }) }
  const boundary = `tani-${crypto.randomUUID()}`
  const body = [
    `--${boundary}`, 'Content-Type: application/json; charset=UTF-8', '', JSON.stringify(metadata),
    `--${boundary}`, 'Content-Type: application/json; charset=UTF-8', '', JSON.stringify(post), `--${boundary}--`, '',
  ].join('\r\n')
  return request<{ id: string }>(accessToken, `${UPLOAD_API}/files${fileId ? `/${fileId}` : ''}?uploadType=multipart&fields=id`, {
    method: fileId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  })
}

export async function createPost(accessToken: string, folderId: string, post: DrivePost) {
  return upload(accessToken, folderId, post)
}

export async function updatePost(accessToken: string, folderId: string, post: DrivePost, fileId: string) {
  return upload(accessToken, folderId, post, fileId)
}

export async function readPost(accessToken: string, fileId: string) {
  return request<DrivePost>(accessToken, `${DRIVE_API}/files/${fileId}?alt=media`)
}

export async function deletePost(accessToken: string, fileId: string) {
  await request<void>(accessToken, `${DRIVE_API}/files/${fileId}`, { method: 'DELETE' })
}