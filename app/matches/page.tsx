'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getMatches } from '@/app/actions/matches'
import { formatRelativeTime } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'

export default function MatchesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeMatches, setActiveMatches] = useState<any[]>([])
  const [expiredMatches, setExpiredMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'active' | 'expired'>('active')

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  useEffect(() => {
    loadMatches()
  }, [])

  const loadMatches = async () => {
    try {
      const result = await getMatches()
      if (result.success) {
        setActiveMatches(result.activeMatches || [])
        setExpiredMatches(result.expiredMatches || [])
      }
    } catch (error) {
      console.error('Error loading matches:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted text-sm">Loading matches...</p>
        </div>
      </div>
    )
  }

  const displayMatches = activeTab === 'active' ? activeMatches : expiredMatches

  return (
    <>
      <div className="min-h-screen bg-background pt-4 px-4 pb-24">
        {/* Page Header */}
        <div className="max-w-md mx-auto mb-5 relative flex items-center justify-between px-1">
          <div></div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">Matches</h1>
          <button
            onClick={handleLogout}
            className="px-3 py-2 text-sm font-medium text-foreground hover:bg-primary-50 rounded-lg transition"
          >
            Log out
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-md mx-auto mb-4">
          <div className="bg-white rounded-2xl p-1 shadow-soft flex">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === 'active'
                  ? 'bg-primary-500 text-white shadow-action'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Active ({activeMatches.length})
            </button>
            <button
              onClick={() => setActiveTab('expired')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === 'expired'
                  ? 'bg-primary-500 text-white shadow-action'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Expired ({expiredMatches.length})
            </button>
          </div>
        </div>

        {/* Matches List */}
        <div className="max-w-md mx-auto">
          {displayMatches.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-card p-10 text-center">
              <div className="text-5xl mb-4">{activeTab === 'active' ? '💔' : '⏰'}</div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                {activeTab === 'active' ? 'No Active Matches' : 'No Expired Matches'}
              </h2>
              <p className="text-muted text-sm mb-6 leading-relaxed">
                {activeTab === 'active'
                  ? 'Keep swiping to find your perfect PFC date!'
                  : 'No expired conversations yet.'}
              </p>
              {activeTab === 'active' && (
                <Link
                  href="/swipe"
                  className="inline-block bg-primary-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-primary-dark transition shadow-action"
                >
                  Start Swiping
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {displayMatches.map((match) => {
                const photos = (match.otherProfile?.photos as string[]) || []
                const isExpired = match.isExpired

                return (
                  <div
                    key={match.id}
                    className={`bg-white rounded-2xl shadow-card p-4 ${
                      isExpired ? 'opacity-50' : 'hover:shadow-card-hover'
                    } transition`}
                  >
                    {isExpired && (
                      <div className="mb-2 px-3 py-1 bg-gray-100 text-muted text-xs rounded-full inline-block font-medium">
                        {match.expiredReason}
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <Link href={`/profile/${match.otherProfile.id}`}>
                        <div className="relative w-14 h-14 flex-shrink-0 cursor-pointer hover:opacity-80 transition">
                          {photos[0] && (
                            <Image
                              src={photos[0]}
                              alt={match.otherProfile.name}
                              fill
                              className="object-cover rounded-full"
                            />
                          )}
                        </div>
                      </Link>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground">
                          {match.otherProfile.name}, {match.otherProfile.age}
                        </h3>
                        {match.userConfirmed && (
                          <p className="text-xs text-emerald-500 font-medium">✓ You confirmed</p>
                        )}
                        {match.otherConfirmed && (
                          <p className="text-xs text-emerald-500 font-medium">✓ They confirmed</p>
                        )}
                      </div>

                      <div className="text-[10px] text-muted">
                        {formatRelativeTime(match.created_at)}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Link
                        href={`/profile/${match.otherProfile.id}`}
                        className="flex-1 py-2 text-center border border-primary-500 text-primary-500 rounded-xl text-sm font-medium hover:bg-primary-50 transition"
                      >
                        View Profile
                      </Link>
                      {!isExpired && (
                        <Link
                          href={`/chat/${match.chat?.id}`}
                          className="flex-1 py-2 text-center bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition"
                        >
                          Message
                        </Link>
                      )}
                      {isExpired && (
                        <div className="flex-1 py-2 text-center bg-gray-100 text-muted rounded-xl text-sm font-medium cursor-not-allowed">
                          Expired
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </>
  )
}
