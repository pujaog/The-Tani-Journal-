'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMemo, useState } from 'react'

const schema = z.object({ name: z.string().trim().min(2, 'Enter your name.'), email: z.string().email('Enter a valid email.'), password: z.string().min(8, 'Use at least 8 characters.') })
type FormValues = z.infer<typeof schema>

function strength(password: string) { return [password.length >= 8, /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length }

export default function SignUpPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const { register, watch, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) })
  const score = useMemo(() => strength(watch('password') || ''), [watch('password')])

  async function submit(values: FormValues) {
    setError('')
    const response = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
    if (!response.ok) { setError((await response.json()).error || 'Could not create your account.'); return }
    router.push('/auth/signin?created=1')
  }

  return <main className="min-h-screen bg-[#f4f0e8] px-6 py-16 text-stone-900"><div className="mx-auto max-w-md bg-white p-8 shadow-xl shadow-stone-900/5"><p className="mb-3 text-xs uppercase tracking-[0.25em] text-stone-500">The Tani Journal</p><h1 className="font-serif text-4xl">Make a little room.</h1><p className="mt-3 text-stone-500">Your private writing desk, with a path to publication.</p><form onSubmit={handleSubmit(submit)} className="mt-8 space-y-4"><label className="block text-sm">Name<input {...register('name')} autoComplete="name" className="mt-2 w-full border border-stone-200 px-3 py-3" />{errors.name && <span className="mt-1 block text-xs text-rose-600">{errors.name.message}</span>}</label><label className="block text-sm">Email<input {...register('email')} type="email" autoComplete="email" className="mt-2 w-full border border-stone-200 px-3 py-3" />{errors.email && <span className="mt-1 block text-xs text-rose-600">{errors.email.message}</span>}</label><label className="block text-sm">Password<input {...register('password')} type="password" autoComplete="new-password" className="mt-2 w-full border border-stone-200 px-3 py-3" />{errors.password && <span className="mt-1 block text-xs text-rose-600">{errors.password.message}</span>}<span className="mt-2 flex gap-1">{[1, 2, 3, 4].map((item) => <i key={item} className={`h-1.5 flex-1 ${item <= score ? (score > 2 ? 'bg-emerald-600' : 'bg-amber-500') : 'bg-stone-200'}`} />)}</span></label>{error && <p className="text-sm text-rose-600">{error}</p>}<button disabled={isSubmitting} className="w-full bg-stone-900 px-4 py-3 text-sm text-white disabled:opacity-50">{isSubmitting ? 'Creating account...' : 'Create account'}</button></form><p className="mt-6 text-sm text-stone-500">Already writing here? <Link href="/auth/signin" className="text-stone-900 underline">Sign in</Link></p></div></main>
}