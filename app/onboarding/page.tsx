'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UCLA_FRATS_SORORITIES, GENDER_OPTIONS, MAX_PHOTOS } from '@/lib/constants'
import { validateImageFile, feetInchesToCm } from '@/lib/utils'
import Image from 'next/image'
import EightBallLogo from '@/components/EightBallLogo'

// Steps: 0 = pool code, 1 = name/age/gender, 2 = frat/height, 3 = preferences, 4 = bio/photos
const TOTAL_PROFILE_STEPS = 4

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(0)
  const [poolCode, setPoolCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [validatingCode, setValidatingCode] = useState(false)
  const [stepError, setStepError] = useState<string | null>(null)

  useEffect(() => {
    if (step > 0 && !poolCode) setStep(0)
  }, [step, poolCode])

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

  // --- Pool code step ---
  const handlePoolCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidatingCode(true)
    setCodeError(null)
    try {
      const { isPoolCodeValid } = await import('@/app/actions/pool')
      const trimmed = poolCode.trim()
      const valid = await isPoolCodeValid(trimmed)
      if (!valid) {
        setCodeError('Invalid pool code. Check with your organizer or try again.')
        return
      }
      setPoolCode(trimmed.toLowerCase())
      setStep(1)
    } catch {
      setCodeError('Something went wrong. Please try again.')
    } finally {
      setValidatingCode(false)
    }
  }

  // --- Per-step validation before advancing ---
  const validateStep = (): string | null => {
    if (step === 1) {
      if (!formData.name.trim()) return 'Please enter your name.'
      const age = parseInt(formData.age)
      if (!formData.age || isNaN(age) || age < 18 || age > 100) return 'Please enter a valid age (18–100).'
    }
    if (step === 2) {
      if (!formData.frat) return 'Please select your fraternity or sorority.'
      const feet = parseInt(formData.heightFeet)
      const inches = parseInt(formData.heightInches)
      if (!formData.heightFeet || isNaN(feet) || feet < 4 || feet > 7) return 'Please enter a valid height (feet).'
      if (formData.heightInches === '' || isNaN(inches) || inches < 0 || inches > 11) return 'Please enter valid inches (0–11).'
    }
    if (step === 4) {
      if (!formData.one_liner.trim()) return 'Please write a short bio.'
      if (photos.length !== MAX_PHOTOS) return `Please upload exactly ${MAX_PHOTOS} photos.`
    }
    return null
  }

  const handleNext = () => {
    const err = validateStep()
    if (err) { setStepError(err); return }
    setStepError(null)
    setStep(step + 1)
  }

  const handleBack = () => {
    setStepError(null)
    setStep(step - 1)
  }

  // --- Photos ---
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (photos.length + files.length > MAX_PHOTOS) {
      setStepError(`You can only upload up to ${MAX_PHOTOS} photos.`)
      return
    }
    for (const file of files) {
      const validation = validateImageFile(file)
      if (!validation.valid) { setStepError(validation.error!); return }
    }
    setPhotos([...photos, ...files])
    setPhotoPreviews([...photoPreviews, ...files.map(f => URL.createObjectURL(f))])
    setStepError(null)
  }

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index])
    setPhotos(photos.filter((_, i) => i !== index))
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index))
  }

  // --- Final submit ---
  const handleSubmit = async () => {
    const err = validateStep()
    if (err) { setStepError(err); return }
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const photoUrls: string[] = []
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}-${i}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('profile-photos').upload(fileName, file)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('profile-photos').getPublicUrl(fileName)
        photoUrls.push(publicUrl)
      }

      const height_cm = feetInchesToCm(parseInt(formData.heightFeet), parseInt(formData.heightInches))

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
        dating_pool: poolCode.trim().toLowerCase(),
      })
      if (profileError) throw profileError

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

  // --- Step 0: Pool code ---
  if (step === 0) {
    return (
      <div className="min-h-screen bg-pink-500 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-4">
            <EightBallLogo size={64} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">Join a pool</h1>
          <p className="text-gray-600 mb-6 text-center">
            Enter your pool code to get started.
          </p>
          <form onSubmit={handlePoolCodeSubmit} className="space-y-4">
            <input
              type="text"
              value={poolCode}
              onChange={(e) => setPoolCode(e.target.value)}
              required
              placeholder="Enter code"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-gray-900"
            />
            {codeError && (
              <div className="p-3 bg-red-50 text-red-800 rounded-lg border border-red-200 text-sm">{codeError}</div>
            )}
            <button
              type="submit"
              disabled={validatingCode || !poolCode.trim()}
              className="w-full bg-pink-500 text-white py-3 rounded-lg font-semibold hover:bg-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {validatingCode ? 'Checking...' : 'Continue →'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // --- Progress bar (steps 1–4) ---
  const progress = ((step - 1) / TOTAL_PROFILE_STEPS) * 100

  return (
    <div className="min-h-screen bg-pink-500 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100">
          <div
            className="h-full bg-pink-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-8">
          {/* Step counter */}
          <p className="text-xs text-gray-400 mb-6 text-right">
            Step {step} of {TOTAL_PROFILE_STEPS}
          </p>

          {/* --- Step 1: Name, Age, Gender --- */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">About you</h2>
                <p className="text-gray-500 text-sm">The basics first.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age *</label>
                <input
                  type="number"
                  min="18"
                  max="100"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">I am a *</label>
                <div className="flex gap-3">
                  {(['men', 'women'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFormData({ ...formData, gender: g })}
                      className={`flex-1 py-3 rounded-lg font-medium transition ${
                        formData.gender === g ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {g === 'men' ? 'Man' : 'Woman'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --- Step 2: Frat, Height --- */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Your chapter</h2>
                <p className="text-gray-500 text-sm">Where do you call home?</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fraternity / Sorority *</label>
                <select
                  value={formData.frat}
                  onChange={(e) => setFormData({ ...formData, frat: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-gray-900"
                >
                  <option value="">Select...</option>
                  {UCLA_FRATS_SORORITIES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Height *</label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    min="4"
                    max="7"
                    placeholder="ft"
                    value={formData.heightFeet}
                    onChange={(e) => setFormData({ ...formData, heightFeet: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-gray-900"
                  />
                  <input
                    type="number"
                    min="0"
                    max="11"
                    placeholder="in"
                    value={formData.heightInches}
                    onChange={(e) => setFormData({ ...formData, heightInches: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-gray-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* --- Step 3: Interested in, Frat whitelist --- */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Your preferences</h2>
                <p className="text-gray-500 text-sm">Who do you want to see?</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Show me *</label>
                <div className="flex gap-3">
                  {GENDER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, interested_in: opt.value as any })}
                      className={`flex-1 py-3 rounded-lg font-medium transition ${
                        formData.interested_in === opt.value ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Only show me people from <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <p className="text-xs text-gray-400 mb-2">Leave empty to see everyone.</p>
                <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                  {UCLA_FRATS_SORORITIES.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          frat_whitelist: formData.frat_whitelist.includes(f)
                            ? formData.frat_whitelist.filter((x) => x !== f)
                            : [...formData.frat_whitelist, f],
                        })
                      }
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                        formData.frat_whitelist.includes(f) ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --- Step 4: Bio, Photos --- */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Your profile</h2>
                <p className="text-gray-500 text-sm">Make a great first impression.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio * <span className="text-gray-400 font-normal text-xs">({formData.one_liner.length}/200)</span>
                </label>
                <textarea
                  value={formData.one_liner}
                  onChange={(e) => setFormData({ ...formData, one_liner: e.target.value })}
                  maxLength={200}
                  rows={3}
                  placeholder="Tell us something interesting about yourself..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none resize-none text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photos * <span className="text-gray-400 font-normal text-xs">({photos.length}/{MAX_PHOTOS})</span>
                </label>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {photoPreviews.map((preview, i) => (
                    <div key={i} className="relative aspect-square">
                      <Image src={preview} alt={`Preview ${i + 1}`} fill className="object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {photos.length < MAX_PHOTOS && (
                    <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-pink-500 transition">
                      <span className="text-gray-400 text-2xl">+</span>
                      <input type="file" accept="image/*" multiple onChange={handlePhotoChange} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-800 rounded-lg border border-red-200 text-sm">{error}</div>
              )}
            </div>
          )}

          {/* Per-step error */}
          {stepError && (
            <div className="mt-4 p-3 bg-red-50 text-red-800 rounded-lg border border-red-200 text-sm">{stepError}</div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 py-3 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
            >
              ← Back
            </button>
            {step < TOTAL_PROFILE_STEPS ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 py-3 rounded-lg font-semibold bg-pink-500 text-white hover:bg-pink-600 transition"
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-3 rounded-lg font-semibold bg-pink-500 text-white hover:bg-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating profile...' : 'Start Swiping →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
