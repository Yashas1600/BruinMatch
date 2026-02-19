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
      <div className="min-h-screen bg-pink-500 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-pink-500 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Profile not found</p>
          <Link
            href="/matches"
            className="mt-4 inline-block text-pink-500 hover:text-pink-600"
          >
            Back to Matches
          </Link>
        </div>
      </div>
    )
  }

  const photos = (profile.photos as string[]) || []

  return (
    <div className="h-screen bg-pink-500 flex flex-col">
      {/* Back button */}
      <div className="p-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-white/50 rounded-full transition flex items-center gap-2 text-gray-700"
        >
          <svg
            className="w-6 h-6"
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
          Back
        </button>
      </div>

      {/* Profile Card */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden h-full flex flex-col">
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
                <div className="absolute top-1/2 left-4 transform -translate-y-1/2">
                  <button
                    onClick={() =>
                      setCurrentPhotoIndex((prev) =>
                        prev > 0 ? prev - 1 : photos.length - 1
                      )
                    }
                    className="bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition"
                  >
                    <svg
                      className="w-6 h-6 text-gray-800"
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

                <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
                  <button
                    onClick={() =>
                      setCurrentPhotoIndex((prev) =>
                        prev < photos.length - 1 ? prev + 1 : 0
                      )
                    }
                    className="bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition"
                  >
                    <svg
                      className="w-6 h-6 text-gray-800"
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
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                  {photos.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className={`w-2 h-2 rounded-full transition ${
                        index === currentPhotoIndex
                          ? 'bg-white w-8'
                          : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Profile Info */}
          <div className="p-6 space-y-3 flex-1 overflow-y-auto">
            {/* Name and Age */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {profile.name}, {profile.age}
              </h1>
            </div>

            {/* Frat/Sorority */}
            <div className="flex items-center gap-2 text-gray-700">
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
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <span>{profile.frat}</span>
            </div>

            {/* Height */}
            <div className="flex items-center gap-2 text-gray-700">
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
                  d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                />
              </svg>
              <span>{cmToFeetInches(profile.height_cm)}</span>
            </div>

            {/* One-liner */}
            {profile.one_liner && (
              <div className="pt-3 border-t border-gray-200">
                <p className="text-gray-700 italic">&quot;{profile.one_liner}&quot;</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
