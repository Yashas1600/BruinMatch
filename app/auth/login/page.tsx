'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import EightBallLogo from '@/components/EightBallLogo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const validateUCLAEmail = (value: string): string | null => {
    const lower = value.trim().toLowerCase()
    if (lower.endsWith('@g.ucla.edu') || lower.endsWith('@ucla.edu')) return null
    return "That's not a UCLA email :) Try yourname@ucla.edu"
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    const validationError = validateUCLAEmail(email)
    if (validationError) {
      setMessage({ type: 'error', text: validationError })
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      setMessage({
        type: 'success',
        text: 'Check your email for the login link!',
      })
      setEmail('')
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'An error occurred',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-md w-full bg-white p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <EightBallLogo size={64} />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Pool</h1>
          <p className="text-gray-600">Meet people in your pool</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              UCLA Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="yourname@ucla.edu"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition text-gray-900"
            />
          </div>

          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-500 text-white py-3 rounded-lg font-semibold hover:bg-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          We'll send you a magic link to sign in without a password.
        </p>

        <div className="mt-4 text-center">
          <a
            href="/admin/login"
            className="text-xs text-gray-400 hover:text-gray-600 transition"
          >
            Admin Login
          </a>
        </div>
      </div>
    </div>
  )
}
