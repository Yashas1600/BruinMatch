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
        <div className="min-h-screen bg-background flex items-center justify-center px-6 pb-24">
          <div className="max-w-sm w-full bg-white rounded-3xl shadow-card p-8 text-center">
            <div className="text-5xl mb-4">⏸</div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Matching paused</h1>
            <p className="text-muted text-sm leading-relaxed">
              New profiles aren&apos;t visible right now. Check back later—we&apos;ll resume
              matching soon.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 text-primary-500 hover:text-primary-dark font-semibold text-sm"
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
        <div className="min-h-screen bg-background flex items-center justify-center pb-24">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted text-sm">Loading profiles...</p>
          </div>
        </div>
        <BottomNav />
      </>
    )
  }

  if (!currentCandidate) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center px-6 pb-24">
          <div className="max-w-sm w-full bg-white rounded-3xl shadow-card p-8 text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">No More Profiles</h2>
            <p className="text-muted text-sm mb-6 leading-relaxed">
              You&apos;ve seen everyone! Check back later or adjust your preferences.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setCurrentIndex(0)
                  loadCandidates(true)
                }}
                className="w-full bg-primary-500 text-white py-3 rounded-xl font-semibold hover:bg-primary-dark transition shadow-action"
              >
                Review Skipped Profiles
              </button>
              <Link
                href="/preferences"
                className="w-full bg-primary-50 text-primary-500 py-3 rounded-xl font-semibold hover:bg-primary-100 transition text-center"
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
      <div className="min-h-screen bg-background pt-4 px-4 pb-24">
        <Header />

        <div className="max-w-md mx-auto">
          {/* Profile Card */}
          <div className="bg-white rounded-3xl shadow-card overflow-hidden">
            {/* Photo */}
            <div className="relative aspect-[3/4] bg-gray-100">
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
                <div className="absolute top-3 left-0 right-0 flex gap-1.5 px-3">
                  {photos.map((_, idx) => (
                    <div
                      key={idx}
                      className={`flex-1 h-0.5 rounded-full transition-all ${
                        idx === photoIndex ? 'bg-white' : 'bg-white/30'
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
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-5 pt-16 text-white">
                <h2 className="text-2xl font-bold mb-0.5">
                  {currentCandidate.name}, {currentCandidate.age}
                </h2>
                <p className="text-sm opacity-90 mb-0.5">{currentCandidate.frat}</p>
                <p className="text-xs opacity-70">
                  {cmToFeetInches(currentCandidate.height_cm)}
                </p>
              </div>
            </div>

            {/* Bio */}
            {currentCandidate.one_liner && (
              <div className="px-5 py-4">
                <p className="text-foreground/70 text-sm text-center leading-relaxed">{currentCandidate.one_liner}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center items-center gap-6 mt-6 mb-6">
            <button
              onClick={() => handleSwipe('pass')}
              disabled={swiping}
              className="w-14 h-14 bg-white rounded-full shadow-card hover:shadow-card-hover transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center border border-border"
            >
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <button
              onClick={() => handleSwipe('like')}
              disabled={swiping}
              className="w-16 h-16 bg-primary-500 rounded-full shadow-action hover:shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <BottomNav />

      {/* Match Modal */}
      {matchModal.show && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-card">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-foreground mb-1">It&apos;s a Match!</h2>
            <p className="text-muted text-sm mb-6">
              You and {currentCandidate.name} liked each other!
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push(`/chat/${matchModal.chatId}`)}
                className="w-full bg-primary-500 text-white py-3 rounded-xl font-semibold hover:bg-primary-dark transition shadow-action"
              >
                Send a Message
              </button>
              <button
                onClick={() => {
                  setMatchModal({ show: false })
                }}
                className="w-full bg-primary-50 text-primary-500 py-3 rounded-xl font-semibold hover:bg-primary-100 transition"
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
