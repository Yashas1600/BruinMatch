'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UCLA_FRATS_SORORITIES, GENDER_OPTIONS, MAX_PHOTOS } from '@/lib/constants'
import { feetInchesToCm, cmToFeetInches, validateImageFile } from '@/lib/utils'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import Image from 'next/image'
import { deleteAccount } from '@/app/actions/account'

export default function PreferencesPage() {
  const router = useRouter()
  const supabase = createClient()

  const [profileData, setProfileData] = useState({
    name: '',
    age: '',
    gender: 'men' as 'men' | 'women',
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false)
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

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
          gender: profile.gender || 'men',
          frat: profile.frat,
          heightFeet: feet,
          heightInches: inches,
          one_liner: profile.one_liner || '',
        })

        if (profile.photos) {
          setExistingPhotos(profile.photos as string[])
        }
      }

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
          gender: profileData.gender,
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

    for (const file of files) {
      const validation = validateImageFile(file)
      if (!validation.valid) {
        setPhotosError(validation.error!)
        return
      }
    }

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

      const allPhotoUrls = [...existingPhotos, ...newPhotoUrls]

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photos: allPhotoUrls })
        .eq('id', user.id)

      if (updateError) throw updateError

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

  const handleDeleteAccount = async () => {
    setDeleteAccountError(null)
    setDeleteAccountLoading(true)
    try {
      const result = await deleteAccount()
      if (result.success) {
        await supabase.auth.signOut()
        router.push('/auth/login')
        return
      }
      setDeleteAccountError(result.error || 'Failed to delete account')
    } catch (err: any) {
      setDeleteAccountError(err.message || 'An error occurred')
    } finally {
      setDeleteAccountLoading(false)
    }
  }

  return (
    <>
      <div className="min-h-screen bg-background pt-4 px-4 pb-24">
        <Header />
        <div className="max-w-md mx-auto mt-2">
          {/* Tab Buttons */}
          <div className="bg-white rounded-2xl p-1 shadow-soft flex mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'profile'
                  ? 'bg-primary-500 text-white shadow-action'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Profile
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preferences')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'preferences'
                  ? 'bg-primary-500 text-white shadow-action'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Preferences
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('photos')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'photos'
                  ? 'bg-primary-500 text-white shadow-action'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Photos
            </button>
          </div>

          {/* Profile Information Section */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit}>
              <div className="bg-white rounded-3xl shadow-card p-6">
                <h2 className="text-lg font-bold text-foreground mb-1">Profile Information</h2>
                <p className="text-muted text-xs mb-5">Update your personal details</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">Name *</label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-foreground text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">Age *</label>
                    <input
                      type="number"
                      min="18"
                      max="100"
                      value={profileData.age}
                      onChange={(e) => setProfileData({ ...profileData, age: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-foreground text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">I am a *</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setProfileData({ ...profileData, gender: 'men' })}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${
                          profileData.gender === 'men'
                            ? 'bg-primary-500 text-white'
                            : 'bg-background text-muted border border-border hover:border-primary-200'
                        }`}
                      >
                        Man
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfileData({ ...profileData, gender: 'women' })}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${
                          profileData.gender === 'women'
                            ? 'bg-primary-500 text-white'
                            : 'bg-background text-muted border border-border hover:border-primary-200'
                        }`}
                      >
                        Woman
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">
                      Fraternity/Sorority *
                    </label>
                    <select
                      value={profileData.frat}
                      onChange={(e) => setProfileData({ ...profileData, frat: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-foreground text-sm"
                    >
                      <option value="">Select...</option>
                      {UCLA_FRATS_SORORITIES.map((frat) => (
                        <option key={frat} value={frat}>
                          {frat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">Height *</label>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        min="4"
                        max="7"
                        placeholder="Feet"
                        value={profileData.heightFeet}
                        onChange={(e) => setProfileData({ ...profileData, heightFeet: e.target.value })}
                        required
                        className="flex-1 px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-foreground text-sm"
                      />
                      <input
                        type="number"
                        min="0"
                        max="11"
                        placeholder="Inches"
                        value={profileData.heightInches}
                        onChange={(e) => setProfileData({ ...profileData, heightInches: e.target.value })}
                        required
                        className="flex-1 px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-foreground text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">
                      Bio (max 200 characters) *
                    </label>
                    <textarea
                      value={profileData.one_liner}
                      onChange={(e) => setProfileData({ ...profileData, one_liner: e.target.value })}
                      maxLength={200}
                      rows={3}
                      required
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none text-foreground text-sm"
                      placeholder="Tell us something interesting about yourself..."
                    />
                    <p className="text-[10px] text-muted mt-1">
                      {profileData.one_liner.length}/200
                    </p>
                  </div>
                </div>

                {profileSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 mt-5 text-sm">
                    {profileSuccess}
                  </div>
                )}

                {profileError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 mt-5 text-sm">
                    {profileError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={profileLoading}
                  className="w-full bg-primary-500 text-white py-3 rounded-xl font-semibold hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed mt-5 shadow-action text-sm"
                >
                  {profileLoading ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </form>
          )}

          {/* Dating Preferences Section */}
          {activeTab === 'preferences' && (
            <form onSubmit={handlePreferencesSubmit}>
              <div className="bg-white rounded-3xl shadow-card p-6">
                <h2 className="text-lg font-bold text-foreground mb-1">Dating Preferences</h2>
                <p className="text-muted text-xs mb-5">Tell us who you&apos;re looking to meet</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">
                      Looking For *
                    </label>
                    <div className="flex gap-3">
                      {GENDER_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            setPreferencesData({ ...preferencesData, interested_in: option.value as any })
                          }
                          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${
                            preferencesData.interested_in === option.value
                              ? 'bg-primary-500 text-white'
                              : 'bg-background text-muted border border-border hover:border-primary-200'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">
                      Frat/Sorority Preferences
                    </label>
                    <p className="text-[10px] text-muted mb-2">
                      Leave empty to see everyone, or select specific ones
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto p-2 border border-border rounded-xl bg-background">
                      {UCLA_FRATS_SORORITIES.map((frat) => (
                        <button
                          key={frat}
                          type="button"
                          onClick={() => toggleFrat(frat)}
                          className={`py-2 px-2 rounded-lg text-xs font-medium transition ${
                            preferencesData.frat_whitelist.includes(frat)
                              ? 'bg-primary-500 text-white'
                              : 'bg-white text-muted hover:text-foreground hover:border-primary-200 border border-transparent'
                          }`}
                        >
                          {frat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {preferencesSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 mt-5 text-sm">
                    {preferencesSuccess}
                  </div>
                )}

                {preferencesError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 mt-5 text-sm">
                    {preferencesError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={preferencesLoading}
                  className="w-full bg-primary-500 text-white py-3 rounded-xl font-semibold hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed mt-5 shadow-action text-sm"
                >
                  {preferencesLoading ? 'Updating...' : 'Update Preferences'}
                </button>
              </div>
            </form>
          )}

          {/* Photos Section */}
          {activeTab === 'photos' && (
            <form onSubmit={handlePhotosSubmit}>
              <div className="bg-white rounded-3xl shadow-card p-6">
                <h2 className="text-lg font-bold text-foreground mb-1">Update Photos</h2>
                <p className="text-muted text-xs mb-5">Manage your profile photos ({existingPhotos.length + photos.length}/{MAX_PHOTOS})</p>

                <div className="space-y-4">
                  {existingPhotos.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">
                        Current Photos
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {existingPhotos.map((photo, index) => (
                          <div key={index} className="relative aspect-square">
                            <Image
                              src={photo}
                              alt={`Photo ${index + 1}`}
                              fill
                              className="object-cover rounded-xl"
                            />
                            <button
                              type="button"
                              onClick={() => removeExistingPhoto(index)}
                              className="absolute -top-1.5 -right-1.5 bg-primary-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs hover:bg-primary-dark"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {photos.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">
                        New Photos (not saved yet)
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {photoPreviews.map((preview, index) => (
                          <div key={index} className="relative aspect-square">
                            <Image
                              src={preview}
                              alt={`New photo ${index + 1}`}
                              fill
                              className="object-cover rounded-xl"
                            />
                            <button
                              type="button"
                              onClick={() => removeNewPhoto(index)}
                              className="absolute -top-1.5 -right-1.5 bg-primary-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs hover:bg-primary-dark"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {existingPhotos.length + photos.length < MAX_PHOTOS && (
                    <div>
                      <label className="block w-full py-6 border-2 border-dashed border-border rounded-xl text-center cursor-pointer hover:border-primary-300 transition bg-background">
                        <span className="text-muted text-sm">
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

                {photosSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 mt-5 text-sm">
                    {photosSuccess}
                  </div>
                )}

                {photosError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 mt-5 text-sm">
                    {photosError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={photosLoading || (existingPhotos.length + photos.length !== MAX_PHOTOS)}
                  className="w-full bg-primary-500 text-white py-3 rounded-xl font-semibold hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed mt-5 shadow-action text-sm"
                >
                  {photosLoading ? 'Updating...' : 'Update Photos'}
                </button>
              </div>
            </form>
          )}

          {/* Delete account */}
          <div className="mt-6 bg-white rounded-3xl shadow-card p-6">
            <h2 className="text-sm font-bold text-foreground mb-1">Delete Account</h2>
            <p className="text-muted text-xs mb-4 leading-relaxed">
              Permanently delete your profile, matches, and messages. This cannot be undone.
            </p>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-50 text-red-500 rounded-xl text-sm font-medium hover:bg-red-100 transition"
            >
              Delete my account
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-card">
            <h3 className="text-lg font-bold text-foreground mb-2">Delete account?</h3>
            <p className="text-muted text-sm mb-6 leading-relaxed">
              Your profile, matches, and messages will be permanently removed. This cannot be undone.
            </p>
            {deleteAccountError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-xs">
                {deleteAccountError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteAccountError(null)
                }}
                disabled={deleteAccountLoading}
                className="flex-1 py-3 rounded-xl font-semibold bg-background text-muted hover:text-foreground disabled:opacity-50 text-sm border border-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteAccountLoading}
                className="flex-1 py-3 rounded-xl font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 text-sm"
              >
                {deleteAccountLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </>
  )
}
