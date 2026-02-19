'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UCLA_FRATS_SORORITIES, GENDER_OPTIONS, MAX_PHOTOS } from '@/lib/constants'
import { validateImageFile, feetInchesToCm } from '@/lib/utils'
import Image from 'next/image'
import EightBallLogo from '@/components/EightBallLogo'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<'code' | 'profile'>('code')
  const [eventCode, setEventCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [validatingCode, setValidatingCode] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'men' as 'men' | 'women',
    frat: '',
    heightFeet: '',
    heightInches: '',
    interested_in: 'everyone' as 'men' | 'women' | 'everyone',
    frat_whitelist: [] as string[],
    one_liner: '',
  })

  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEventCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidatingCode(true)
    setCodeError(null)

    try {
      const { isPoolCodeValid } = await import('@/app/actions/pool')
      const trimmed = eventCode.trim()
      const valid = await isPoolCodeValid(trimmed)
      if (!valid) {
        setCodeError('Invalid dating pool code. Please check with your event organizer.')
        return
      }
      setEventCode(trimmed)
      setStep('profile')
    } catch (err: any) {
      setCodeError('An error occurred. Please try again.')
    } finally {
      setValidatingCode(false)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    if (photos.length + files.length > MAX_PHOTOS) {
      setError(`You can only upload up to ${MAX_PHOTOS} photos`)
      return
    }

    // Validate each file
    for (const file of files) {
      const validation = validateImageFile(file)
      if (!validation.valid) {
        setError(validation.error!)
        return
      }
    }

    // Create previews
    const newPreviews = files.map(file => URL.createObjectURL(file))
    setPhotos([...photos, ...files])
    setPhotoPreviews([...photoPreviews, ...newPreviews])
    setError(null)
  }

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index])
    setPhotos(photos.filter((_, i) => i !== index))
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate photos
      if (photos.length !== MAX_PHOTOS) {
        throw new Error(`Please upload exactly ${MAX_PHOTOS} photos`)
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upload photos to Supabase Storage
      const photoUrls: string[] = []
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}-${i}.${fileExt}`

        const { error: uploadError, data } = await supabase.storage
          .from('profile-photos')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('profile-photos')
          .getPublicUrl(fileName)

        photoUrls.push(publicUrl)
      }

      // Create profile
      const height_cm = feetInchesToCm(
        parseInt(formData.heightFeet),
        parseInt(formData.heightInches)
      )

      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        email: user.email!,
        name: formData.name,
        age: parseInt(formData.age),
        gender: formData.gender,
        frat: formData.frat,
        height_cm,
        interested_in: formData.interested_in,
        one_liner: formData.one_liner,
        photos: photoUrls,
        dating_pool: eventCode,
      })

      if (profileError) throw profileError

      // Create preferences
      const { error: prefsError } = await supabase.from('preferences').insert({
        user_id: user.id,
        frat_whitelist: formData.frat_whitelist.length > 0 ? formData.frat_whitelist : null,
        age_min: 18,
        age_max: 100,
        height_min: feetInchesToCm(4, 0),
        height_max: feetInchesToCm(7, 0),
        interested_in: formData.interested_in,
      })

      if (prefsError) throw prefsError

      router.push('/')
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Event Code Step
  if (step === 'code') {
    return (
      <div className="min-h-screen bg-pink-500 py-8 px-4">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-4">
            <EightBallLogo size={64} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">Pool</h1>
          <p className="text-gray-600 mb-2 text-center">Meet people in your pool</p>
          <p className="text-gray-600 mb-8 text-center">Enter your dating pool code to get started</p>

          <form onSubmit={handleEventCodeSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dating Pool Code *</label>
              <input
                type="text"
                value={eventCode}
                onChange={(e) => setEventCode(e.target.value)}
                required
                placeholder="Enter your dating pool code"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-gray-900"
              />
              <p className="text-sm text-gray-500 mt-1">
                You'll only be matched with people who have the same dating pool code
              </p>
            </div>

            {codeError && (
              <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
                {codeError}
              </div>
            )}

            <button
              type="submit"
              disabled={validatingCode || !eventCode}
              className="w-full bg-pink-500 text-white py-3 rounded-lg font-semibold hover:bg-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {validatingCode ? 'Validating...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Profile Creation Step
  return (
    <div className="min-h-screen bg-pink-500 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <div className="mb-8">
          <button
            onClick={() => setStep('code')}
            className="text-pink-500 hover:text-pink-600 mb-4 flex items-center gap-2"
          >
            ← Back to dating pool code
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Profile</h1>
          <p className="text-gray-600">Dating Pool: <span className="font-semibold">{eventCode}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-gray-900"
            />
          </div>

          {/* Age */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Age *</label>
            <input
              type="number"
              min="18"
              max="100"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-gray-900"
            />
          </div>

          {/* Frat/Sorority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fraternity/Sorority *
            </label>
            <select
              value={formData.frat}
              onChange={(e) => setFormData({ ...formData, frat: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-gray-900"
            >
              <option value="">Select...</option>
              {UCLA_FRATS_SORORITIES.map((frat) => (
                <option key={frat} value={frat}>
                  {frat}
                </option>
              ))}
            </select>
          </div>

          {/* Height */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Height *</label>
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="number"
                  min="4"
                  max="7"
                  placeholder="Feet"
                  value={formData.heightFeet}
                  onChange={(e) => setFormData({ ...formData, heightFeet: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-gray-900"
                />
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  max="11"
                  placeholder="Inches"
                  value={formData.heightInches}
                  onChange={(e) => setFormData({ ...formData, heightInches: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Gender Identity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              I am a: *
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, gender: 'men' })}
                className={`flex-1 py-3 rounded-lg font-medium transition ${
                  formData.gender === 'men'
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Man
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, gender: 'women' })}
                className={`flex-1 py-3 rounded-lg font-medium transition ${
                  formData.gender === 'women'
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Woman
              </button>
            </div>
          </div>

          {/* Interested In */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Show me: *
            </label>
            <div className="flex gap-4">
              {GENDER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, interested_in: option.value as any })}
                  className={`flex-1 py-3 rounded-lg font-medium transition ${
                    formData.interested_in === option.value
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Frat Whitelist */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Only show me people from (Optional)
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Leave empty to see everyone, or select specific fraternities/sororities
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 border border-gray-200 rounded-lg">
              {UCLA_FRATS_SORORITIES.map((frat) => (
                <button
                  key={frat}
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      frat_whitelist: formData.frat_whitelist.includes(frat)
                        ? formData.frat_whitelist.filter(f => f !== frat)
                        : [...formData.frat_whitelist, frat],
                    })
                  }}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                    formData.frat_whitelist.includes(frat)
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {frat}
                </button>
              ))}
            </div>
          </div>

          {/* One-liner */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              One-liner Bio * (max 200 characters)
            </label>
            <textarea
              value={formData.one_liner}
              onChange={(e) => setFormData({ ...formData, one_liner: e.target.value })}
              maxLength={200}
              rows={3}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none resize-none text-gray-900"
              placeholder="Tell us something interesting about yourself..."
            />
            <p className="text-sm text-gray-500 mt-1">
              {formData.one_liner.length}/200 characters
            </p>
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload {MAX_PHOTOS} Photos *
            </label>

            <div className="grid grid-cols-3 gap-4 mb-4">
              {photoPreviews.map((preview, index) => (
                <div key={index} className="relative aspect-square">
                  <Image
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    fill
                    className="object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {photos.length < MAX_PHOTOS && (
              <label className="block w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-pink-500 transition">
                <span className="text-gray-600">
                  Click to upload ({photos.length}/{MAX_PHOTOS})
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || photos.length !== MAX_PHOTOS}
            className="w-full bg-pink-500 text-white py-3 rounded-lg font-semibold hover:bg-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Profile...' : 'Start Swiping'}
          </button>
        </form>
      </div>
    </div>
  )
}
