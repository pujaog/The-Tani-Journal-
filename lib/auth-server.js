import { createRemoteJWKSet, jwtVerify } from 'jose'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

// Firebase publishes its public keys as a JWK Set. jose will handle caching + rotation.
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
)

export async function verifyIdTokenFromRequest(request) {
  if (!PROJECT_ID) return null
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) return null
  const token = authHeader.slice(7).trim()
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    })
    return {
      uid: payload.user_id || payload.sub,
      email: payload.email || null,
      name: payload.name || null,
      picture: payload.picture || null,
      emailVerified: !!payload.email_verified,
    }
  } catch (err) {
    console.error('Token verify failed:', err?.message)
    return null
  }
}
