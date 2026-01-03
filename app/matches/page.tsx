'use client'

import { useState, useEffect } from 'react'
import { getMatches } from '@/app/actions/matches'
import { formatRelativeTime } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'

export default function MatchesPage() {
  const [activeMatches, setActiveMatches] = useState<any[]>([])
  const [expiredMatches, setExpiredMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'active' | 'expired'>('active')

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
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading matches...</p>
        </div>
      </div>
    )
  }

  const displayMatches = activeTab === 'active' ? activeMatches : expiredMatches

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-4 px-4 pb-24">
        <Header />

        {/* Tabs */}
        <div className="max-w-2xl mx-auto mb-4 flex gap-2">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              activeTab === 'active'
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Active ({activeMatches.length})
          </button>
          <button
            onClick={() => setActiveTab('expired')}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              activeTab === 'expired'
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Expired ({expiredMatches.length})
          </button>
        </div>

        {/* Matches List */}
        <div className="max-w-2xl mx-auto">
          {displayMatches.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
              <div className="text-6xl mb-4">{activeTab === 'active' ? '💔' : '⏰'}</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {activeTab === 'active' ? 'No Active Matches' : 'No Expired Matches'}
              </h2>
              <p className="text-gray-600 mb-6">
                {activeTab === 'active'
                  ? 'Keep swiping to find your perfect PFC date!'
                  : 'No expired conversations yet.'}
              </p>
              {activeTab === 'active' && (
                <Link
                  href="/swipe"
                  className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 transition"
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
                    className={`bg-white rounded-2xl shadow-md p-4 ${
                      isExpired ? 'opacity-60' : 'hover:shadow-lg'
                    } transition`}
                  >
                    {isExpired && (
                      <div className="mb-2 px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-full inline-block">
                        {match.expiredReason}
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      {/* Profile Photo */}
                      <Link href={`/profile/${match.otherProfile.id}`}>
                        <div className="relative w-16 h-16 flex-shrink-0 cursor-pointer hover:opacity-80 transition">
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

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {match.otherProfile.name}, {match.otherProfile.age}
                        </h3>
                        {match.userConfirmed && (
                          <p className="text-sm text-green-600">✓ You confirmed</p>
                        )}
                        {match.otherConfirmed && (
                          <p className="text-sm text-green-600">✓ They confirmed</p>
                        )}
                      </div>

                      {/* Time */}
                      <div className="text-xs text-gray-400">
                        {formatRelativeTime(match.created_at)}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-3">
                      <Link
                        href={`/profile/${match.otherProfile.id}`}
                        className="flex-1 py-2 text-center border-2 border-pink-500 text-pink-500 rounded-lg font-medium hover:bg-pink-50 transition"
                      >
                        View Profile
                      </Link>
                      {!isExpired && (
                        <Link
                          href={`/chat/${match.chat?.id}`}
                          className="flex-1 py-2 text-center bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-medium hover:from-pink-600 hover:to-purple-600 transition"
                        >
                          Message
                        </Link>
                      )}
                      {isExpired && (
                        <div className="flex-1 py-2 text-center bg-gray-300 text-gray-600 rounded-lg font-medium cursor-not-allowed">
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
