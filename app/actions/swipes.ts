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
    // Check if a swipe already exists
    const { data: existingSwipe } = await supabase
      .from('swipes')
      .select('*')
      .eq('swiper', user.id)
      .eq('swipee', swipeeId)
      .single()

    if (existingSwipe) {
      // Update existing swipe
      const { error: updateError } = await supabase
        .from('swipes')
        .update({ decision })
        .eq('swiper', user.id)
        .eq('swipee', swipeeId)

      if (updateError) throw updateError
    } else {
      // Insert new swipe
      const { error: swipeError } = await supabase.from('swipes').insert({
        swiper: user.id,
        swipee: swipeeId,
        decision,
      })

      if (swipeError) throw swipeError
    }

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

export async function getCandidates(limit: number = 10, includeSkipped: boolean = false) {
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

    // Get user's profile to check gender and dating_pool
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('gender, dating_pool')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return { success: false, error: 'Profile not found', candidates: [] }
    }

    // Get IDs of users already swiped
    let swipedIds: string[] = []
    let passedIds: string[] = []

    if (includeSkipped) {
      // Only show profiles they passed on
      const { data: passedUsers, error: passedError } = await supabase
        .from('swipes')
        .select('swipee')
        .eq('swiper', user.id)
        .eq('decision', 'pass')

      console.log('Passed users query:', { passedUsers, passedError, userId: user.id })
      passedIds = passedUsers?.map((s) => s.swipee) || []
      console.log('Passed IDs:', passedIds)
    } else {
      // Exclude all swiped users
      const { data: swipedUsers } = await supabase
        .from('swipes')
        .select('swipee')
        .eq('swiper', user.id)

      swipedIds = swipedUsers?.map((s) => s.swipee) || []
    }

    // If reviewing skipped profiles, show all passed profiles without filters
    if (includeSkipped) {
      console.log('includeSkipped is true, passedIds:', passedIds)
      if (passedIds.length > 0) {
        // Don't apply limit when reviewing skipped - show all of them
        const { data: passedProfiles, error } = await supabase
          .from('profiles')
          .select('*')
          .in('id', passedIds)
          .eq('is_finalized', false)
          .eq('dating_pool', userProfile.dating_pool)

        console.log('Passed profiles result:', { passedProfiles, error })
        if (error) throw error

        return { success: true, candidates: passedProfiles || [] }
      } else {
        console.log('No passed IDs found')
        return { success: true, candidates: [] }
      }
    }

    // Build query for candidates (normal mode)
    console.log('Building query with filters:', {
      age_min: preferences.age_min,
      age_max: preferences.age_max,
      height_min: preferences.height_min,
      height_max: preferences.height_max,
      frat_whitelist: preferences.frat_whitelist,
      currentUserId: user.id
    })

    let query = supabase
      .from('profiles')
      .select('*')
      .eq('is_finalized', false)
      .eq('dating_pool', userProfile.dating_pool)
      .neq('id', user.id)
      .gte('age', preferences.age_min)
      .lte('age', preferences.age_max)
      .gte('height_cm', preferences.height_min)
      .lte('height_cm', preferences.height_max)

    // Apply frat whitelist if set
    if (preferences.frat_whitelist && preferences.frat_whitelist.length > 0) {
      console.log('Applying frat whitelist filter:', preferences.frat_whitelist)
      query = query.in('frat', preferences.frat_whitelist)
    }

    // Exclude already swiped
    if (swipedIds.length > 0) {
      console.log('Excluding already swiped IDs:', swipedIds)
      query = query.not('id', 'in', `(${swipedIds.join(',')})`)
    }

    const { data: candidates, error } = await query.limit(limit)

    if (error) throw error

    console.log('Raw candidates from query:', candidates)
    console.log('User preferences:', preferences)
    console.log('Excluded swipe IDs:', swipedIds)

    // Filter by gender matching logic - only check what the current user wants to see
    const filteredCandidates = (candidates || []).filter((candidate) => {
      // Only check if current user wants to see this candidate's gender
      const matches = (
        preferences.interested_in === 'everyone' ||
        preferences.interested_in === candidate.gender
      )
      console.log(`Candidate ${candidate.name} (gender: ${candidate.gender}): ${matches ? 'INCLUDED' : 'FILTERED OUT'}`)
      return matches
    })

    console.log('Filtered candidates:', filteredCandidates)

    return { success: true, candidates: filteredCandidates }
  } catch (error: any) {
    return { success: false, error: error.message, candidates: [] }
  }
}
