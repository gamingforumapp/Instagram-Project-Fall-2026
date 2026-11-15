'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function AuthListener() {
  const router = useRouter()

  useEffect(() => {
    // 1. If user landed on any route with type=recovery in the hash fragment
    if (
      typeof window !== 'undefined' &&
      window.location.hash.includes('type=recovery')
    ) {
      router.push('/update-password')
      return
    }

    // 2. Listen for Supabase Auth state change PASSWORD_RECOVERY event
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/update-password')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  return null
}
