'use client'

import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'

const schema = z.object({ email: z.string().email('Enter a valid email.'), password: z.string().min(8, 'Use at least 8 characters.') })
type FormValues = z.infer<typeof schema>

export default function SignInPage() {
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function submit(values: FormValues) {
    setError('')
    const result = await signIn('credentials', { ...values, redirect: false, callbackUrl: '/' })
    if (result?.error) setError('Those details did not match an account.')
    else window.location.assign(result?.url || '/')
  }

  return <main className="min-h-screen bg-[#f4f0e8] px-6 py-16 text-stone-900"><div className="mx-auto max-w-md bg-white p-8 shadow-xl shadow-stone-900/5"><p className="mb-3 text-xs uppercase tracking-[0.25em] text-stone-500">The Tani Journal</p><h1 className="font-serif text-4xl">Welcome back.</h1><p className="mt-3 text-stone-500">Return to your desk and keep the story moving.</p><form onSubmit={handleSubmit(submit)} className="mt-8 space-y-4"><label className="block text-sm">Email<input {...register('email')} type="email" autoComplete="email" className="mt-2 w-full border border-stone-200 px-3 py-3" />{errors.email && <span className="mt-1 block text-xs text-rose-600">{errors.email.message}</span>}</label><label className="block text-sm">Password<input {...register('password')} type="password" autoComplete="current-password" className="mt-2 w-full border border-stone-200 px-3 py-3" />{errors.password && <span className="mt-1 block text-xs text-rose-600">{errors.password.message}</span>}</label>{error && <p className="text-sm text-rose-600">{error}</p>}<button disabled={isSubmitting} className="w-full bg-stone-900 px-4 py-3 text-sm text-white disabled:opacity-50">{isSubmitting ? 'Signing in...' : 'Sign in'}</button></form><button onClick={() => signIn('google', { callbackUrl: '/' })} className="mt-3 w-full border border-stone-300 px-4 py-3 text-sm">Continue with Google Drive</button><p className="mt-6 text-sm text-stone-500">New here? <Link href="/auth/signup" className="text-stone-900 underline">Create an account</Link></p></div></main>
}