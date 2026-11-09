'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  const router = useRouter()
  const [error, setError] = useState(false)

  async function handleLogout() {
    setError(false)
    const { error: signOutError } = await createClient().auth.signOut()
    if (signOutError) {
      setError(true)
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-lg border border-[#30343b] px-3 py-2 hover:bg-[#171b22]"
    >
      {error ? 'Try again' : 'Log out'}
    </button>
  )
}
