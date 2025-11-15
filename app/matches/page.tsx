'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/supabase/database.types'
import { formatRelativeTime } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'

type MatchWithProfile = {
  matchId: string
  chatId: string
  profile: Profile
  createdAt: string
  lastMessage?: {
    body: string
    createdAt: string
  }
}

export default function MatchesPage() {
  const supabase = createClient()
  const [matches, setMatches] = useState<MatchWithProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMatches()
  }, [])

  const loadMatches = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Get all matches for the user
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (matchesError) throw matchesError

      // For each match, get the other user's profile and chat info
      const matchesWithProfiles = await Promise.all(
        (matchesData || []).map(async (match) => {
          const otherUserId = match.user_a === user.id ? match.user_b : match.user_a

          // Get other user's profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', otherUserId)
            .single()

          // Get chat
          const { data: chat } = await supabase
            .from('chats')
            .select('id')
            .eq('match_id', match.id)
            .single()

          // Get last message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('body, created_at')
            .eq('chat_id', chat?.id || '')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          return {
            matchId: match.id,
            chatId: chat?.id || '',
            profile: profile!,
            createdAt: match.created_at,
            lastMessage: lastMessage || undefined,
          }
        })
      )

      setMatches(matchesWithProfiles.filter((m) => m.profile))
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

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-4 px-4 pb-24">
        <Header />

      {/* Matches List */}
      <div className="max-w-2xl mx-auto">
        {matches.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-6xl mb-4">💔</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Matches Yet</h2>
            <p className="text-gray-600 mb-6">
              Keep swiping to find your perfect PFC date!
            </p>
            <Link
              href="/swipe"
              className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 transition"
            >
              Start Swiping
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => {
              const photos = (match.profile.photos as string[]) || []
              return (
                <div key={match.matchId} className="bg-white rounded-2xl shadow-md hover:shadow-lg transition p-4">
                  <div className="flex items-center gap-4">
                    {/* Profile Photo */}
                    <Link href={`/profile/${match.profile.id}`}>
                      <div className="relative w-16 h-16 flex-shrink-0 cursor-pointer hover:opacity-80 transition">
                        {photos[0] && (
                          <Image
                            src={photos[0]}
                            alt={match.profile.name}
                            fill
                            className="object-cover rounded-full"
                          />
                        )}
                      </div>
                    </Link>

                    {/* Info */}
                    <Link href={`/chat/${match.chatId}`} className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {match.profile.name}, {match.profile.age}
                      </h3>
                      {match.lastMessage ? (
                        <p className="text-sm text-gray-600 truncate">
                          {match.lastMessage.body}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Start the conversation!</p>
                      )}
                    </Link>

                    {/* Time */}
                    <div className="text-xs text-gray-400">
                      {formatRelativeTime(match.lastMessage?.createdAt || match.createdAt)}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-3">
                    <Link
                      href={`/profile/${match.profile.id}`}
                      className="flex-1 py-2 text-center border-2 border-pink-500 text-pink-500 rounded-lg font-medium hover:bg-pink-50 transition"
                    >
                      View Profile
                    </Link>
                    <Link
                      href={`/chat/${match.chatId}`}
                      className="flex-1 py-2 text-center bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-medium hover:from-pink-600 hover:to-purple-600 transition"
                    >
                      Message
                    </Link>
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
