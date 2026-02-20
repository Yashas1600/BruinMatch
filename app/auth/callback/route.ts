import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Check if user has completed onboarding
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      // New user - redirect to onboarding
      return NextResponse.redirect(`${origin}/onboarding`)
    }

    const { data: preferences } = await supabase
      .from('preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!preferences) {
      // Profile exists but no preferences - redirect to preferences
      return NextResponse.redirect(`${origin}/preferences`)
    }

    // Existing user with profile + preferences - send to home so it can redirect by pool status (waiting / paused / swipe)
    return NextResponse.redirect(`${origin}/`)
  }

  // Not logged in - go to login
  return NextResponse.redirect(`${origin}/auth/login`)
}
