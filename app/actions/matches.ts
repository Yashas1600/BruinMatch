'use server'

import { createClient } from '@/lib/supabase/server'

export async function getMatches() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated', matches: [] }
  }

  try {
    // Get all matches for current user
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('*, chats(*)')
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (matchesError) throw matchesError

    // For each match, get the other user's profile and check if they've confirmed with someone else
    const matchesWithDetails = await Promise.all(
      (matches || []).map(async (match) => {
        const otherUserId = match.user_a === user.id ? match.user_b : match.user_a

        // Get other user's profile
        const { data: otherProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherUserId)
          .single()

        // Get confirmations for this match
        const { data: matchConfirmations } = await supabase
          .from('date_confirmations')
          .select('*')
          .eq('match_id', match.id)

        const userConfirmed = matchConfirmations?.some((c) => c.confirmer === user.id)
        const otherConfirmed = matchConfirmations?.some((c) => c.confirmer === otherUserId)

        // Check if the other user has confirmed with ANYONE (not just this match)
        const { data: otherUserAnyConfirmation } = await supabase
          .from('date_confirmations')
          .select('*, matches!inner(*)')
          .eq('confirmer', otherUserId)
          .limit(1)
          .single()

        // Check if current user has confirmed with ANYONE
        const { data: currentUserAnyConfirmation } = await supabase
          .from('date_confirmations')
          .select('*, matches!inner(*)')
          .eq('confirmer', user.id)
          .limit(1)
          .single()

        // Match is expired if:
        // - The other user confirmed with someone else (not this match)
        // - OR current user confirmed with someone else (not this match)
        const otherUserConfirmedElsewhere = otherUserAnyConfirmation && otherUserAnyConfirmation.match_id !== match.id
        const currentUserConfirmedElsewhere = currentUserAnyConfirmation && currentUserAnyConfirmation.match_id !== match.id

        const isExpired = otherUserConfirmedElsewhere || currentUserConfirmedElsewhere

        return {
          ...match,
          otherProfile,
          chat: (match.chats as any)?.[0],
          userConfirmed,
          otherConfirmed,
          isExpired,
          expiredReason: otherUserConfirmedElsewhere
            ? `${otherProfile?.name} matched with someone else`
            : currentUserConfirmedElsewhere
            ? 'You matched with someone else'
            : null
        }
      })
    )

    // Split into active and expired
    const activeMatches = matchesWithDetails.filter(m => !m.isExpired)
    const expiredMatches = matchesWithDetails.filter(m => m.isExpired)

    return {
      success: true,
      activeMatches,
      expiredMatches,
      allMatches: matchesWithDetails
    }
  } catch (error: any) {
    return { success: false, error: error.message, matches: [] }
  }
}
