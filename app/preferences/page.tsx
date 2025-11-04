'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UCLA_FRATS_SORORITIES, GENDER_OPTIONS, MAX_PHOTOS } from '@/lib/constants'
import { feetInchesToCm, cmToFeetInches, validateImageFile } from '@/lib/utils'
import Header from '@/components/Header'
import Image from 'next/image'

export default function PreferencesPage() {
  const router = useRouter()
  const supabase = createClient()

  const [profileData, setProfileData] = useState({
    name: '',
    age: '',
    frat: '',
    heightFeet: '',
    heightInches: '',
    one_liner: '',
  })

  const [preferencesData, setPreferencesData] = useState({
    frat_whitelist: [] as string[],
    age_min: '18',
    age_max: '30',
    heightMinFeet: '4',
    heightMinInches: '0',
    heightMaxFeet: '7',
    heightMaxInches: '0',
    interested_in: 'everyone' as 'men' | 'women' | 'everyone',
  })

  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'photos'>('profile')
  const [profileLoading, setProfileLoading] = useState(false)
  const [preferencesLoading, setPreferencesLoading] = useState(false)
  const [photosLoading, setPhotosLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [preferencesError, setPreferencesError] = useState<string | null>(null)
  const [photosError, setPhotosError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [preferencesSuccess, setPreferencesSuccess] = useState<string | null>(null)
  const [photosSuccess, setPhotosSuccess] = useState<string | null>(null)
  const [hasPreferences, setHasPreferences] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [existingPhotos, setExistingPhotos] = useState<string[]>([])

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        const profileHeight = cmToFeetInches(profile.height_cm)
        const [feet, inches] = profileHeight.split("'").map(s => s.replace('"', ''))

        setProfileData({
          name: profile.name,
          age: profile.age.toString(),
          frat: profile.frat,
          heightFeet: feet,
          heightInches: inches,
          one_liner: profile.one_liner || '',
        })

        // Load existing photos
        if (profile.photos) {
          setExistingPhotos(profile.photos as string[])
        }
      }

      // Load preferences data
      const { data: preferences } = await supabase
        .from('preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (preferences) {
        setHasPreferences(true)
        const heightMin = cmToFeetInches(preferences.height_min)
        const heightMax = cmToFeetInches(preferences.height_max)
        const [minFeet, minInches] = heightMin.split("'").map(s => s.replace('"', ''))
        const [maxFeet, maxInches] = heightMax.split("'").map(s => s.replace('"', ''))

        setPreferencesData({
          frat_whitelist: preferences.frat_whitelist || [],
          age_min: preferences.age_min.toString(),
          age_max: preferences.age_max.toString(),
          heightMinFeet: minFeet,
          heightMinInches: minInches,
          heightMaxFeet: maxFeet,
          heightMaxInches: maxInches,
          interested_in: preferences.interested_in,
        })
      } else if (profile) {
        // Default to profile's interested_in
        setPreferencesData(prev => ({ ...prev, interested_in: profile.interested_in }))
      }
    } catch (err) {
      console.error('Error loading preferences:', err)
    }
  }

  const toggleFrat = (frat: string) => {
    setPreferencesData(prev => ({
      ...prev,
      frat_whitelist: prev.frat_whitelist.includes(frat)
        ? prev.frat_whitelist.filter(f => f !== frat)
        : [...prev.frat_whitelist, frat],
    }))
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileLoading(true)
    setProfileError(null)
    setProfileSuccess(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const profile_height_cm = feetInchesToCm(
        parseInt(profileData.heightFeet),
        parseInt(profileData.heightInches)
      )

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: profileData.name,
          age: parseInt(profileData.age),
          frat: profileData.frat,
          height_cm: profile_height_cm,
          one_liner: profileData.one_liner,
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      setProfileSuccess('Profile updated successfully!')
      setTimeout(() => setProfileSuccess(null), 3000)
    } catch (err: any) {
      setProfileError(err.message || 'An error occurred')
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPreferencesLoading(true)
    setPreferencesError(null)
    setPreferencesSuccess(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Use wide default ranges for age and height
      const prefsData = {
        user_id: user.id,
        frat_whitelist: preferencesData.frat_whitelist.length > 0 ? preferencesData.frat_whitelist : null,
        age_min: 18,
        age_max: 100,
        height_min: feetInchesToCm(4, 0),
        height_max: feetInchesToCm(7, 0),
        interested_in: preferencesData.interested_in,
      }

      if (hasPreferences) {
        const { error: updateError } = await supabase
          .from('preferences')
          .update(prefsData)
          .eq('user_id', user.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('preferences')
          .insert(prefsData)

        if (insertError) throw insertError
        setHasPreferences(true)
      }

      setPreferencesSuccess('Dating preferences updated successfully!')
      setTimeout(() => setPreferencesSuccess(null), 3000)
    } catch (err: any) {
      setPreferencesError(err.message || 'An error occurred')
    } finally {
      setPreferencesLoading(false)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const totalPhotos = existingPhotos.length + photos.length + files.length

    if (totalPhotos > MAX_PHOTOS) {
      setPhotosError(`You can only have up to ${MAX_PHOTOS} photos total`)
      return
    }

    // Validate each file
    for (const file of files) {
      const validation = validateImageFile(file)
      if (!validation.valid) {
        setPhotosError(validation.error!)
        return
      }
    }

    // Create previews
    const newPreviews = files.map(file => URL.createObjectURL(file))
    setPhotos([...photos, ...files])
    setPhotoPreviews([...photoPreviews, ...newPreviews])
    setPhotosError(null)
  }

  const removeNewPhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index])
    setPhotos(photos.filter((_, i) => i !== index))
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index))
  }

  const removeExistingPhoto = (index: number) => {
    setExistingPhotos(existingPhotos.filter((_, i) => i !== index))
  }

  const handlePhotosSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPhotosLoading(true)
    setPhotosError(null)
    setPhotosSuccess(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const totalPhotos = existingPhotos.length + photos.length
      if (totalPhotos !== MAX_PHOTOS) {
        throw new Error(`Please have exactly ${MAX_PHOTOS} photos`)
      }

      // Upload new photos to Supabase Storage
      const newPhotoUrls: string[] = []
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}-${i}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('profile-photos')
          .getPublicUrl(fileName)

        newPhotoUrls.push(publicUrl)
      }

      // Combine existing and new photos
      const allPhotoUrls = [...existingPhotos, ...newPhotoUrls]

      // Update profile with new photos array
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photos: allPhotoUrls })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Clear new photos and update existing
      setExistingPhotos(allPhotoUrls)
      setPhotos([])
      photoPreviews.forEach(url => URL.revokeObjectURL(url))
      setPhotoPreviews([])

      setPhotosSuccess('Photos updated successfully!')
      setTimeout(() => setPhotosSuccess(null), 3000)
    } catch (err: any) {
      setPhotosError(err.message || 'An error occurred')
    } finally {
      setPhotosLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-4 px-4">
      <Header />
      <div className="max-w-2xl mx-auto mt-4">
        {/* Tab Buttons */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Profile Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              activeTab === 'preferences'
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Dating Preferences
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('photos')}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              activeTab === 'photos'
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Photos
          </button>
        </div>

        {/* Profile Information Section */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit}>
            <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Information</h2>
            <p className="text-gray-600 mb-6">Update your personal details</p>

            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
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
                  value={profileData.age}
                  onChange={(e) => setProfileData({ ...profileData, age: e.target.value })}
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
                  value={profileData.frat}
                  onChange={(e) => setProfileData({ ...profileData, frat: e.target.value })}
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
                  <input
                    type="number"
                    min="4"
                    max="7"
                    placeholder="Feet"
                    value={profileData.heightFeet}
                    onChange={(e) => setProfileData({ ...profileData, heightFeet: e.target.value })}
                    required
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-gray-900"
                  />
                  <input
                    type="number"
                    min="0"
                    max="11"
                    placeholder="Inches"
                    value={profileData.heightInches}
                    onChange={(e) => setProfileData({ ...profileData, heightInches: e.target.value })}
                    required
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-gray-900"
                  />
                </div>
              </div>

              {/* One-liner */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  One-liner Bio * (max 200 characters)
                </label>
                <textarea
                  value={profileData.one_liner}
                  onChange={(e) => setProfileData({ ...profileData, one_liner: e.target.value })}
                  maxLength={200}
                  rows={3}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none resize-none text-gray-900"
                  placeholder="Tell us something interesting about yourself..."
                />
                <p className="text-sm text-gray-500 mt-1">
                  {profileData.one_liner.length}/200 characters
                </p>
              </div>
            </div>

            {/* Profile messages and submit */}
            {profileSuccess && (
              <div className="p-4 bg-green-50 text-green-800 rounded-lg border border-green-200 mt-6">
                {profileSuccess}
              </div>
            )}

            {profileError && (
              <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200 mt-6">
                {profileError}
              </div>
            )}

            <button
              type="submit"
              disabled={profileLoading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {profileLoading ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </form>
        )}

        {/* Dating Preferences Section */}
        {activeTab === 'preferences' && (
          <form onSubmit={handlePreferencesSubmit}>
            <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Dating Preferences</h2>
            <p className="text-gray-600 mb-6">Tell us who you're looking to meet</p>

            <div className="space-y-6">
              {/* Interested In */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Looking For *
                </label>
                <div className="flex gap-4">
                  {GENDER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setPreferencesData({ ...preferencesData, interested_in: option.value as any })
                      }
                      className={`flex-1 py-3 rounded-lg font-medium transition ${
                        preferencesData.interested_in === option.value
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
                  Fraternity/Sorority Preferences (Optional)
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Leave empty to see everyone, or select specific ones
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                  {UCLA_FRATS_SORORITIES.map((frat) => (
                    <button
                      key={frat}
                      type="button"
                      onClick={() => toggleFrat(frat)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                        preferencesData.frat_whitelist.includes(frat)
                          ? 'bg-pink-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {frat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preferences messages and submit */}
            {preferencesSuccess && (
              <div className="p-4 bg-green-50 text-green-800 rounded-lg border border-green-200 mt-6">
                {preferencesSuccess}
              </div>
            )}

            {preferencesError && (
              <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200 mt-6">
                {preferencesError}
              </div>
            )}

            <button
              type="submit"
              disabled={preferencesLoading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {preferencesLoading ? 'Updating...' : 'Update Dating Preferences'}
            </button>
          </div>
        </form>
        )}

        {/* Photos Section */}
        {activeTab === 'photos' && (
          <form onSubmit={handlePhotosSubmit}>
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Update Photos</h2>
              <p className="text-gray-600 mb-6">Manage your profile photos ({existingPhotos.length + photos.length}/{MAX_PHOTOS})</p>

              <div className="space-y-6">
                {/* Existing Photos */}
                {existingPhotos.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Photos
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      {existingPhotos.map((photo, index) => (
                        <div key={index} className="relative aspect-square">
                          <Image
                            src={photo}
                            alt={`Photo ${index + 1}`}
                            fill
                            className="object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingPhoto(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Photos */}
                {photos.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Photos (not saved yet)
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      {photoPreviews.map((preview, index) => (
                        <div key={index} className="relative aspect-square">
                          <Image
                            src={preview}
                            alt={`New photo ${index + 1}`}
                            fill
                            className="object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeNewPhoto(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload New Photos */}
                {existingPhotos.length + photos.length < MAX_PHOTOS && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Add More Photos
                    </label>
                    <label className="block w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-pink-500 transition">
                      <span className="text-gray-600">
                        Click to upload ({existingPhotos.length + photos.length}/{MAX_PHOTOS})
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Photos messages and submit */}
              {photosSuccess && (
                <div className="p-4 bg-green-50 text-green-800 rounded-lg border border-green-200 mt-6">
                  {photosSuccess}
                </div>
              )}

              {photosError && (
                <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200 mt-6">
                  {photosError}
                </div>
              )}

              <button
                type="submit"
                disabled={photosLoading || (existingPhotos.length + photos.length !== MAX_PHOTOS)}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {photosLoading ? 'Updating...' : 'Update Photos'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
