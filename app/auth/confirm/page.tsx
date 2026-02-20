'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { type EmailOtpType } from '@supabase/supabase-js'
import EightBallLogo from '@/components/EightBallLogo'

function ConfirmContent() {
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const supabase = createClient()

  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  useEffect(() => {
    if (!token_hash || !type) {
      setError('Invalid or missing sign-in link. Please request a new one.')
      return
    }

    const verify = async () => {
      const { error } = await supabase.auth.verifyOtp({ token_hash, type })

      if (error) {
        setError(error.message || 'Sign in failed. Please request a new magic link.')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Sign in failed. Please request a new magic link.')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profile) {
        // Full page navigation ensures session cookies are included in the next request
        window.location.href = '/onboarding'
        return
      }

      const { data: preferences } = await supabase
        .from('preferences')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!preferences) {
        window.location.href = '/preferences'
        return
      }

      window.location.href = '/swipe'
    }

    verify()
  }, [token_hash, type])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-md w-full bg-white p-8 text-center">
        <div className="flex justify-center mb-4">
          <EightBallLogo size={64} />
        </div>

        {error ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Link expired</h1>
            <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-800 border border-red-200 text-sm">
              {error}
            </div>
            <a href="/auth/login" className="text-pink-500 font-semibold hover:underline">
              Request a new link →
            </a>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Signing you in...</h1>
            <div className="flex justify-center mt-4">
              <div className="w-8 h-8 border-2 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-gray-500">loading...</div>
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  )
}
