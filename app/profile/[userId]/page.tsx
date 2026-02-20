'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/supabase/database.types'
import { cmToFeetInches } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  useEffect(() => {
    loadProfile()
  }, [userId])

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted text-sm">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted text-sm">Profile not found</p>
          <Link
            href="/matches"
            className="mt-4 inline-block text-primary-500 hover:text-primary-dark text-sm font-medium"
          >
            Back to Matches
          </Link>
        </div>
      </div>
    )
  }

  const photos = (profile.photos as string[]) || []

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Back button */}
      <div className="p-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-primary-50 rounded-full transition flex items-center gap-1.5 text-foreground"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      {/* Profile Card */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="max-w-md mx-auto bg-white rounded-3xl shadow-card overflow-hidden h-full flex flex-col">
          {/* Photos */}
          <div className="relative flex-shrink-0">
            <div className="relative aspect-[3/4] w-full max-h-[60vh]">
              {photos[currentPhotoIndex] && (
                <Image
                  src={photos[currentPhotoIndex]}
                  alt={`${profile.name}'s photo ${currentPhotoIndex + 1}`}
                  fill
                  className="object-cover"
                />
              )}
            </div>

            {/* Photo navigation */}
            {photos.length > 1 && (
              <>
                <div className="absolute top-1/2 left-3 transform -translate-y-1/2">
                  <button
                    onClick={() =>
                      setCurrentPhotoIndex((prev) =>
                        prev > 0 ? prev - 1 : photos.length - 1
                      )
                    }
                    className="bg-white/90 hover:bg-white p-2 rounded-full shadow-card transition"
                  >
                    <svg
                      className="w-5 h-5 text-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                </div>

                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <button
                    onClick={() =>
                      setCurrentPhotoIndex((prev) =>
                        prev < photos.length - 1 ? prev + 1 : 0
                      )
                    }
                    className="bg-white/90 hover:bg-white p-2 rounded-full shadow-card transition"
                  >
                    <svg
                      className="w-5 h-5 text-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>

                {/* Photo dots */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {photos.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className={`h-1.5 rounded-full transition-all ${
                        index === currentPhotoIndex
                          ? 'bg-white w-6'
                          : 'bg-white/40 w-1.5'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Profile Info */}
          <div className="p-5 space-y-3 flex-1 overflow-y-auto">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {profile.name}, {profile.age}
              </h1>
            </div>

            <div className="flex items-center gap-2 text-muted">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <span className="text-sm">{profile.frat}</span>
            </div>

            <div className="flex items-center gap-2 text-muted">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                />
              </svg>
              <span className="text-sm">{cmToFeetInches(profile.height_cm)}</span>
            </div>

            {profile.one_liner && (
              <div className="pt-3 border-t border-border">
                <p className="text-foreground/70 text-sm italic leading-relaxed">&quot;{profile.one_liner}&quot;</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
