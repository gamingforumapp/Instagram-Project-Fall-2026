'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextUrl = searchParams.get('next') || '/profile'
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
      return
    }

    router.push(nextUrl)
    router.refresh()
  }

  const handleOAuthSignIn = async (provider: 'google' | 'discord') => {
    setErrorMsg(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
      },
    })

    if (error) {
      setErrorMsg(error.message)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 text-zinc-100">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-xl backdrop-blur">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Log in to see what your communities are playing.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            {errorMsg}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-300"
            >
              Password
            </label>
            <div className="relative mt-1">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800/80 px-3 py-2 pr-16 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            
            <div className="mt-2 flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-zinc-400 hover:text-indigo-400"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-zinc-100 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="w-full border-t border-zinc-800"></div>
          <span className="absolute bg-zinc-900 px-3 text-xs uppercase text-zinc-500">
            or
          </span>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => handleOAuthSignIn('google')}
            className="flex w-full items-center justify-center gap-3 rounded-md border border-zinc-700 bg-zinc-800/60 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
          >
            Continue with Google
          </button>
          
          <button
            type="button"
            onClick={() => handleOAuthSignIn('discord')}
            className="flex w-full items-center justify-center gap-3 rounded-md border border-zinc-700 bg-zinc-800/60 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
          >
            Continue with Discord
          </button>
        </div>

        {/* Footer Redirect to Signup */}
        <p className="text-center text-xs text-zinc-400">
          New here?{' '}
          <Link
            href="/signup"
            className="font-medium text-indigo-400 hover:underline"
          >
            Create an account
          </Link>
        </p>

      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 text-zinc-100">
          <div className="text-sm text-zinc-400">Loading...</div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
