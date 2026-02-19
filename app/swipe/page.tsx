'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Profile } from '@/lib/supabase/database.types'
import { cmToFeetInches } from '@/lib/utils'
import { swipe, getCandidates } from '@/app/actions/swipes'
import { getPoolStatusForCurrentUser } from '@/app/actions/pool'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'

export default function SwipePage() {
  const router = useRouter()
  const [candidates, setCandidates] = useState<Profile[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [swiping, setSwiping] = useState(false)
  const [poolGate, setPoolGate] = useState<'open' | 'waiting' | 'paused' | null>(null)
  const [matchModal, setMatchModal] = useState<{
    show: boolean
    matchId?: string
    chatId?: string
  }>({ show: false })

  useEffect(() => {
    let cancelled = false
    async function init() {
      const pool = await getPoolStatusForCurrentUser()
      if (cancelled) return
      if (!pool) {
        setLoading(false)
        return
      }
      if (pool.status === 'waiting') {
        setPoolGate('waiting')
        setLoading(false)
        return
      }
      if (pool.status === 'paused') {
        setPoolGate('paused')
        setLoading(false)
        return
      }
      setPoolGate('open')
      loadCandidates()
    }
    init()
    return () => { cancelled = true }
  }, [])

  const loadCandidates = async (includeSkipped: boolean = false) => {
    setLoading(true)
    console.log('Loading candidates, includeSkipped:', includeSkipped)
    const result = await getCandidates(20, includeSkipped)
    console.log('getCandidates result:', result)
    if (result.success) {
      console.log('Setting candidates:', result.candidates)
      setCandidates(result.candidates)
    } else {
      console.log('Error loading candidates:', result.error)
    }
    setLoading(false)
  }

  const handleSwipe = async (decision: 'like' | 'pass') => {
    if (swiping || !currentCandidate) return

    setSwiping(true)
    console.log('Swiping on:', currentCandidate.id, 'with decision:', decision)
    const result = await swipe(currentCandidate.id, decision)
    console.log('Swipe result:', result)

    if (!result.success) {
      console.error('Swipe failed:', result.error)
      alert('Failed to save swipe: ' + result.error)
    }

    if (result.success && result.matched) {
      setMatchModal({
        show: true,
        matchId: result.matchId,
        chatId: result.chatId,
      })
    }

    setSwiping(false)
    setPhotoIndex(0)
    const newIndex = currentIndex + 1
    setCurrentIndex(newIndex)

    // Only load more if we've actually run out and there might be more
    // Don't reload while we still have candidates to show
    if (newIndex >= candidates.length && candidates.length >= 20) {
      loadCandidates()
    }
  }

  const currentCandidate = candidates[currentIndex]

  if (poolGate === 'waiting') {
    router.replace('/waiting')
    return null
  }

  if (poolGate === 'paused') {
    return (
      <>
        <div className="min-h-screen bg-pink-500 flex items-center justify-center px-4 pb-24">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="text-5xl mb-4">⏸</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Matching has been paused</h1>
            <p className="text-gray-600">
              New profiles aren&apos;t visible right now. Check back later—we&apos;ll resume
              matching soon.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 text-pink-600 hover:text-pink-700 font-medium"
            >
              Refresh
            </button>
          </div>
        </div>
        <BottomNav />
      </>
    )
  }

  if (loading) {
    return (
      <>
        <div className="min-h-screen bg-pink-500 flex items-center justify-center pb-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading profiles...</p>
          </div>
        </div>
        <BottomNav />
      </>
    )
  }

  if (!currentCandidate) {
    return (
      <>
        <div className="min-h-screen bg-pink-500 flex items-center justify-center px-4 pb-24">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No More Profiles</h2>
            <p className="text-gray-600 mb-6">
              You've seen everyone! Check back later or adjust your preferences.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setCurrentIndex(0)
                  loadCandidates(true)
                }}
                className="w-full bg-pink-500 text-white py-3 rounded-lg font-semibold hover:bg-pink-600 transition"
              >
                Review Skipped Profiles
              </button>
              <Link
                href="/preferences"
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
              >
                Update Preferences
              </Link>
            </div>
          </div>
        </div>
        <BottomNav />
      </>
    )
  }

  const photos = (currentCandidate.photos as string[]) || []

  return (
    <>
      <div className="min-h-screen bg-pink-500 py-4 px-4 pb-24">
        <Header />

        {/* Card */}
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Photo */}
            <div className="relative aspect-[3/4] bg-gray-200">
              {photos[photoIndex] && (
                <Image
                  src={photos[photoIndex]}
                  alt={currentCandidate.name}
                  fill
                  className="object-cover"
                  priority
                />
              )}

              {/* Photo indicators */}
              {photos.length > 1 && (
                <div className="absolute top-4 left-0 right-0 flex gap-2 px-4">
                  {photos.map((_, idx) => (
                    <div
                      key={idx}
                      className={`flex-1 h-1 rounded-full ${
                        idx === photoIndex ? 'bg-white' : 'bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Photo navigation */}
              <div className="absolute inset-0 flex">
                <button
                  className="flex-1"
                  onClick={() => setPhotoIndex(Math.max(0, photoIndex - 1))}
                  disabled={photoIndex === 0}
                />
                <button
                  className="flex-1"
                  onClick={() => setPhotoIndex(Math.min(photos.length - 1, photoIndex + 1))}
                  disabled={photoIndex === photos.length - 1}
                />
              </div>

              {/* Info overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 text-white">
                <h2 className="text-3xl font-bold mb-1">
                  {currentCandidate.name}, {currentCandidate.age}
                </h2>
                <p className="text-lg mb-1">{currentCandidate.frat}</p>
                <p className="text-sm opacity-90">
                  {cmToFeetInches(currentCandidate.height_cm)}
                </p>
              </div>
            </div>

            {/* Bio */}
            <div className="p-6">
              <p className="text-gray-700 text-center">{currentCandidate.one_liner}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center items-center gap-8 mt-8 mb-8">
            <button
              onClick={() => handleSwipe('pass')}
              disabled={swiping}
              className="w-16 h-16 bg-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            <button
              onClick={() => handleSwipe('like')}
              disabled={swiping}
              className="w-20 h-20 bg-pink-500 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <BottomNav />

      {/* Match Modal */}
      {matchModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">It's a Match!</h2>
            <p className="text-gray-600 mb-6">
              You and {currentCandidate.name} liked each other!
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push(`/chat/${matchModal.chatId}`)}
                className="w-full bg-pink-500 text-white py-3 rounded-lg font-semibold hover:bg-pink-600 transition"
              >
                Send a Message
              </button>
              <button
                onClick={() => {
                  setMatchModal({ show: false })
                }}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
              >
                Keep Swiping
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
