'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UCLA_FRATS_SORORITIES, GENDER_OPTIONS } from '@/lib/constants'
import { feetInchesToCm, cmToFeetInches } from '@/lib/utils'
import Header from '@/components/Header'

export default function PreferencesPage() {
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    frat_whitelist: [] as string[],
    age_min: '18',
    age_max: '30',
    heightMinFeet: '4',
    heightMinInches: '0',
    heightMaxFeet: '7',
    heightMaxInches: '0',
    interested_in: 'everyone' as 'men' | 'women' | 'everyone',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('interested_in')
        .eq('id', user.id)
        .single()

      const { data: preferences } = await supabase
        .from('preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (preferences) {
        setIsEditing(true)
        const heightMin = cmToFeetInches(preferences.height_min)
        const heightMax = cmToFeetInches(preferences.height_max)
        const [minFeet, minInches] = heightMin.split("'").map(s => s.replace('"', ''))
        const [maxFeet, maxInches] = heightMax.split("'").map(s => s.replace('"', ''))

        setFormData({
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
        setFormData(prev => ({ ...prev, interested_in: profile.interested_in }))
      }
    } catch (err) {
      console.error('Error loading preferences:', err)
    }
  }

  const toggleFrat = (frat: string) => {
    setFormData(prev => ({
      ...prev,
      frat_whitelist: prev.frat_whitelist.includes(frat)
        ? prev.frat_whitelist.filter(f => f !== frat)
        : [...prev.frat_whitelist, frat],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const height_min = feetInchesToCm(
        parseInt(formData.heightMinFeet),
        parseInt(formData.heightMinInches)
      )
      const height_max = feetInchesToCm(
        parseInt(formData.heightMaxFeet),
        parseInt(formData.heightMaxInches)
      )

      const preferencesData = {
        user_id: user.id,
        frat_whitelist: formData.frat_whitelist.length > 0 ? formData.frat_whitelist : null,
        age_min: parseInt(formData.age_min),
        age_max: parseInt(formData.age_max),
        height_min,
        height_max,
        interested_in: formData.interested_in,
      }

      if (isEditing) {
        const { error: updateError } = await supabase
          .from('preferences')
          .update(preferencesData)
          .eq('user_id', user.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('preferences')
          .insert(preferencesData)

        if (insertError) throw insertError
      }

      router.push('/swipe')
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-4 px-4">
      <Header />
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8 mt-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isEditing ? 'Update Your Preferences' : 'Set Your Preferences'}
        </h1>
        <p className="text-gray-600 mb-8">Tell us who you're looking to meet</p>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                    setFormData({ ...formData, interested_in: option.value as any })
                  }
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

          {/* Age Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Age Range *</label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="18"
                max="100"
                value={formData.age_min}
                onChange={(e) => setFormData({ ...formData, age_min: e.target.value })}
                required
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-gray-900"
              />
              <span className="text-gray-500">to</span>
              <input
                type="number"
                min="18"
                max="100"
                value={formData.age_max}
                onChange={(e) => setFormData({ ...formData, age_max: e.target.value })}
                required
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-gray-900"
              />
            </div>
          </div>

          {/* Height Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Height Range *</label>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 mb-2">Minimum</p>
                <div className="flex gap-4">
                  <input
                    type="number"
                    min="4"
                    max="7"
                    placeholder="Feet"
                    value={formData.heightMinFeet}
                    onChange={(e) => setFormData({ ...formData, heightMinFeet: e.target.value })}
                    required
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-gray-900"
                  />
                  <input
                    type="number"
                    min="0"
                    max="11"
                    placeholder="Inches"
                    value={formData.heightMinInches}
                    onChange={(e) =>
                      setFormData({ ...formData, heightMinInches: e.target.value })
                    }
                    required
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-gray-900"
                  />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Maximum</p>
                <div className="flex gap-4">
                  <input
                    type="number"
                    min="4"
                    max="7"
                    placeholder="Feet"
                    value={formData.heightMaxFeet}
                    onChange={(e) => setFormData({ ...formData, heightMaxFeet: e.target.value })}
                    required
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-gray-900"
                  />
                  <input
                    type="number"
                    min="0"
                    max="11"
                    placeholder="Inches"
                    value={formData.heightMaxInches}
                    onChange={(e) =>
                      setFormData({ ...formData, heightMaxInches: e.target.value })
                    }
                    required
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-gray-900"
                  />
                </div>
              </div>
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

          {error && (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : isEditing ? 'Update Preferences' : 'Start Swiping'}
          </button>
        </form>
      </div>
    </div>
  )
}
