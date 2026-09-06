import { hash } from 'bcryptjs'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
})

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid name, email, and password.' }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 409 })

  const user = await prisma.user.create({
    data: { name: parsed.data.name, email: parsed.data.email, passwordHash: await hash(parsed.data.password, 12) },
    select: { id: true, email: true, name: true },
  })
  return NextResponse.json({ user }, { status: 201 })
}