'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function sendMessage(chatId: string, body: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    // Get the match for this chat
    const { data: chat } = await supabase
      .from('chats')
      .select('*, matches(*)')
      .eq('id', chatId)
      .single()

    if (!chat) {
      return { success: false, error: 'Chat not found' }
    }

    const match = chat.matches as any
    const otherUserId = match.user_a === user.id ? match.user_b : match.user_a

    // Check if either user has confirmed with someone else (expired match)
    const { data: otherUserConfirmation } = await supabase
      .from('date_confirmations')
      .select('*, matches!inner(*)')
      .eq('confirmer', otherUserId)
      .limit(1)
      .single()

    const { data: currentUserConfirmation } = await supabase
      .from('date_confirmations')
      .select('*, matches!inner(*)')
      .eq('confirmer', user.id)
      .limit(1)
      .single()

    // Check if match is expired
    const otherUserConfirmedElsewhere = otherUserConfirmation && otherUserConfirmation.match_id !== match.id
    const currentUserConfirmedElsewhere = currentUserConfirmation && currentUserConfirmation.match_id !== match.id

    if (otherUserConfirmedElsewhere || currentUserConfirmedElsewhere) {
      return {
        success: false,
        error: 'This conversation has expired. One of you has already confirmed with someone else.'
      }
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender: user.id,
        body,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath(`/chat/${chatId}`)
    return { success: true, message: data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function confirmDate(matchId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    // Check if user has ALREADY confirmed with ANYONE (first match wins)
    const { data: anyExistingConfirmation } = await supabase
      .from('date_confirmations')
      .select('*, matches!inner(*)')
      .eq('confirmer', user.id)
      .limit(1)
      .single()

    if (anyExistingConfirmation) {
      return {
        success: false,
        error: 'You have already confirmed a date with someone else. You can only confirm one match!'
      }
    }

    // Check if already confirmed this specific match
    const { data: existing } = await supabase
      .from('date_confirmations')
      .select('*')
      .eq('match_id', matchId)
      .eq('confirmer', user.id)
      .single()

    if (existing) {
      return { success: false, error: 'You have already confirmed this date' }
    }

    // Insert confirmation
    const { error: confirmError } = await supabase.from('date_confirmations').insert({
      match_id: matchId,
      confirmer: user.id,
    })

    if (confirmError) throw confirmError

    // Check if both users have confirmed
    const { data: confirmations } = await supabase
      .from('date_confirmations')
      .select('*')
      .eq('match_id', matchId)

    const bothConfirmed = confirmations && confirmations.length === 2

    revalidatePath(`/chat`)
    revalidatePath(`/matches`)
    return { success: true, bothConfirmed }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getChatInfo(chatId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    // Get chat and match
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*, matches(*)')
      .eq('id', chatId)
      .single()

    if (chatError) throw chatError

    const match = chat.matches as any
    const otherUserId = match.user_a === user.id ? match.user_b : match.user_a

    // Get other user's profile
    const { data: otherProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', otherUserId)
      .single()

    if (profileError) throw profileError

    // Get confirmations
    const { data: confirmations } = await supabase
      .from('date_confirmations')
      .select('*')
      .eq('match_id', match.id)

    const userConfirmed = confirmations?.some((c) => c.confirmer === user.id)
    const otherConfirmed = confirmations?.some((c) => c.confirmer === otherUserId)
    const bothConfirmed = userConfirmed && otherConfirmed

    return {
      success: true,
      matchId: match.id,
      otherProfile,
      userConfirmed,
      otherConfirmed,
      bothConfirmed,
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
