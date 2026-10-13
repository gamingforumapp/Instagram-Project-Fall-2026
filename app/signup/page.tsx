'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setError('Please enter a valid email address.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      })

      if (signUpError) {
        const msg = signUpError.message.toLowerCase()
        if (msg.includes('already registered') || msg.includes('already exists')) {
          setError('This email is already registered. Please sign in instead.')
        } else if (msg.includes('password') || msg.includes('weak')) {
          setError('Password is too weak. Please use at least 6 characters.')
        } else {
          setError(signUpError.message)
        }
        return
      }

      // Supabase returns an empty identities array if the user is already registered
      // and email confirmation is required (to prevent user enumeration).
      if (data.user?.identities && data.user.identities.length === 0) {
        setError('This email is already registered. Please sign in instead.')
        return
      }

      setSuccess(
        'Account created successfully! Check your email to confirm your account.'
      )
      setEmail('')
      setPassword('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected network error occurred. Please check your connection and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthSignUp = async (provider: 'discord' | 'google') => {
    try {
      setError(null)
      setLoading(true)
      const supabase = createClient()
      const { error: oAuthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (oAuthError) {
        setError(oAuthError.message)
        setLoading(false)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to initiate OAuth sign-in. Please try again.'
      )
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-1 items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Create an Account
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Join Faction to share clips, reviews, and find teammates.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400"
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 text-zinc-900 placeholder-zinc-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-indigo-400 dark:focus:bg-zinc-900"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 text-zinc-900 placeholder-zinc-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-indigo-400 dark:focus:bg-zinc-900"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Must be at least 6 characters long.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Creating account...
              </span>
            ) : (
              'Sign Up'
            )}
          </button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-200 dark:border-zinc-700"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-zinc-400 dark:bg-[#18181b]">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleOAuthSignUp('discord')}
            disabled={loading}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-md bg-[#5865F2] py-2 text-sm font-medium text-white transition hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Discord
          </button>
          <button
            type="button"
            onClick={() => handleOAuthSignUp('google')}
            disabled={loading}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-zinc-300 bg-zinc-100 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Google
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Already have an account?{' '}
          <Link
            href="/"
            className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Back to Home
          </Link>
        </p>
      </div>
    </main>
  )
}
