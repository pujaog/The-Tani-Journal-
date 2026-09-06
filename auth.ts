import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { compare } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/crypto'
import { findOrCreateFolder } from '@/lib/drive'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'database' },
  providers: [
    Google({
      authorization: { params: { scope: 'openid email profile https://www.googleapis.com/auth/drive.file', access_type: 'offline', prompt: 'consent' } },
    }),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials)
        if (!parsed.success) return null
        const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } })
        if (!user?.passwordHash || !(await compare(parsed.data.password, user.passwordHash))) return null
        return { id: user.id, email: user.email, name: user.name, image: user.image }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.id) return false
      if (account?.provider === 'google' && account.access_token) {
        const driveFolderId = await findOrCreateFolder(account.access_token)
        await prisma.user.update({
          where: { id: user.id },
          data: {
            driveFolderId,
            encryptedDriveAuth: {
              accessToken: encrypt(account.access_token),
              refreshToken: account.refresh_token ? encrypt(account.refresh_token) : null,
              expiresAt: account.expires_at ?? null,
            },
          },
        })
      }
      return true
    },
  },
})