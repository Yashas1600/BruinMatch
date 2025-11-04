'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function swipe(swipeeId: string, decision: 'like' | 'pass') {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    // Insert the swipe
    const { error: swipeError } = await supabase.from('swipes').insert({
      swiper: user.id,
      swipee: swipeeId,
      decision,
    })

    if (swipeError) throw swipeError

    // If it's a like, check for mutual match
    if (decision === 'like') {
      const { data: reciprocalSwipe } = await supabase
        .from('swipes')
        .select('*')
        .eq('swiper', swipeeId)
        .eq('swipee', user.id)
        .eq('decision', 'like')
        .single()

      if (reciprocalSwipe) {
        // Create match with ordered IDs (user_a < user_b)
        const [userA, userB] = [user.id, swipeeId].sort()

        const { data: match, error: matchError } = await supabase
          .from('matches')
          .insert({
            user_a: userA,
            user_b: userB,
          })
          .select()
          .single()

        if (matchError) {
          // Match might already exist
          console.error('Match error:', matchError)
          const { data: existingMatch } = await supabase
            .from('matches')
            .select('*')
            .eq('user_a', userA)
            .eq('user_b', userB)
            .single()

          if (existingMatch) {
            const { data: chat } = await supabase
              .from('chats')
              .select('id')
              .eq('match_id', existingMatch.id)
              .single()

            revalidatePath('/matches')
            return {
              success: true,
              matched: true,
              matchId: existingMatch.id,
              chatId: chat?.id,
            }
          }
        }

        if (match) {
          const { data: chat } = await supabase
            .from('chats')
            .select('id')
            .eq('match_id', match.id)
            .single()

          revalidatePath('/matches')
          return {
            success: true,
            matched: true,
            matchId: match.id,
            chatId: chat?.id,
          }
        }
      }
    }

    return { success: true, matched: false }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getCandidates(limit: number = 10) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated', candidates: [] }
  }

  try {
    // Get user's preferences
    const { data: preferences } = await supabase
      .from('preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!preferences) {
      return { success: false, error: 'Preferences not set', candidates: [] }
    }

    // Get user's profile to check gender
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('interested_in')
      .eq('id', user.id)
      .single()

    // Get IDs of users already swiped
    const { data: swipedUsers } = await supabase
      .from('swipes')
      .select('swipee')
      .eq('swiper', user.id)

    const swipedIds = swipedUsers?.map((s) => s.swipee) || []

    // Build query for candidates
    let query = supabase
      .from('profiles')
      .select('*')
      .eq('is_finalized', false)
      .neq('id', user.id)
      .gte('age', preferences.age_min)
      .lte('age', preferences.age_max)
      .gte('height_cm', preferences.height_min)
      .lte('height_cm', preferences.height_max)

    // Filter by interested_in (mutual gender interest)
    // User wants to see people who match their preference
    // AND those people want to see the user's gender
    if (preferences.interested_in !== 'everyone') {
      query = query.eq('interested_in', preferences.interested_in)
    }

    // Apply frat whitelist if set
    if (preferences.frat_whitelist && preferences.frat_whitelist.length > 0) {
      query = query.in('frat', preferences.frat_whitelist)
    }

    // Exclude already swiped
    if (swipedIds.length > 0) {
      query = query.not('id', 'in', `(${swipedIds.join(',')})`)
    }

    const { data: candidates, error } = await query.limit(limit)

    if (error) throw error

    // Additional filtering for gender compatibility
    const filteredCandidates = (candidates || []).filter((candidate) => {
      // Check if candidate's preference includes user's profile
      if (candidate.interested_in === 'everyone') return true
      if (preferences.interested_in === 'everyone') return true

      // Both have specific preferences - check compatibility
      return (
        (preferences.interested_in === 'men' && candidate.interested_in === 'women') ||
        (preferences.interested_in === 'women' && candidate.interested_in === 'men')
      )
    })

    return { success: true, candidates: filteredCandidates }
  } catch (error: any) {
    return { success: false, error: error.message, candidates: [] }
  }
}
