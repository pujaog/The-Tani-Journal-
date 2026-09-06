import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

function key() {
  const value = process.env.TOKEN_ENCRYPTION_KEY
  if (!value) throw new Error('TOKEN_ENCRYPTION_KEY is required')
  const buffer = Buffer.from(value, /^[0-9a-f]{64}$/i.test(value) ? 'hex' : 'base64')
  if (buffer.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must decode to 32 bytes')
  return buffer
}

export function encrypt(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${encrypted.toString('base64')}`
}

export function decrypt(value: string) {
  const [iv, tag, encrypted] = value.split('.').map((part) => Buffer.from(part, 'base64'))
  const decipher = createDecipheriv('aes-256-gcm', key(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}