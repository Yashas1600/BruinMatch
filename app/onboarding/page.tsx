'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UCLA_FRATS_SORORITIES, GENDER_OPTIONS, MAX_PHOTOS } from '@/lib/constants'
import { validateImageFile, feetInchesToCm } from '@/lib/utils'
import Image from 'next/image'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    frat: '',
    heightFeet: '',
    heightInches: '',
    interested_in: 'everyone' as 'men' | 'women' | 'everyone',
    one_liner: '',
  })

  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        frat: formData.frat,
        height_cm,
        interested_in: formData.interested_in,
        one_liner: formData.one_liner,
        photos: photoUrls,
      })

      if (profileError) throw profileError

      router.push('/preferences')
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Profile</h1>
        <p className="text-gray-600 mb-8">Tell us about yourself to get started</p>

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
                onClick={() => setFormData({ ...formData, interested_in: 'women' as any })}
                className={`flex-1 py-3 rounded-lg font-medium transition ${
                  formData.interested_in === 'women'
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Man
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, interested_in: 'men' as any })}
                className={`flex-1 py-3 rounded-lg font-medium transition ${
                  formData.interested_in === 'men'
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Woman
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              This helps us show you to the right people. You'll choose who you want to see on the next page.
            </p>
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
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Profile...' : 'Continue to Preferences'}
          </button>
        </form>
      </div>
    </div>
  )
}
