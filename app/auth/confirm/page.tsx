'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { type EmailOtpType } from '@supabase/supabase-js'
import EightBallLogo from '@/components/EightBallLogo'

function ConfirmContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  useEffect(() => {
    if (token_hash && type) {
      setReady(true)
    } else {
      setError('Invalid or missing sign-in link. Please request a new one.')
    }
  }, [token_hash, type])

  const handleSignIn = async () => {
    if (!token_hash || !type) return

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.verifyOtp({ token_hash, type })
      if (error) throw error

      // Check profile and redirect accordingly
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('Sign in failed. Please try again.')

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profile) {
        router.push('/onboarding')
        return
      }

      const { data: preferences } = await supabase
        .from('preferences')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!preferences) {
        router.push('/preferences')
        return
      }

      router.push('/swipe')
    } catch (err: any) {
      setError(err.message || 'Sign in failed. Please request a new magic link.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-md w-full bg-white p-8 text-center">
        <div className="flex justify-center mb-4">
          <EightBallLogo size={64} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">you're almost in</h1>
        <p className="text-gray-600 mb-8">tap the button below to complete your sign in</p>

        {error ? (
          <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">
            {error}
            <div className="mt-3">
              <a href="/auth/login" className="text-pink-500 font-semibold hover:underline">
                request a new link →
              </a>
            </div>
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            disabled={loading || !ready}
            className="w-full bg-pink-500 text-white py-4 rounded-lg font-semibold text-lg hover:bg-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'signing you in...' : 'let me in 🚪'}
          </button>
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
