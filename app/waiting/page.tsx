import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPoolStatus, getSignupCount } from '@/app/actions/pool'
import WaitingClient from './WaitingClient'

export default async function WaitingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('dating_pool')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/onboarding')

  const status = await getPoolStatus(profile.dating_pool)
  const count = await getSignupCount(profile.dating_pool)

  if (status === 'active') redirect('/swipe')
  if (status === 'paused') redirect('/paused')

  return (
    <div className="min-h-screen bg-blush-500 flex items-center justify-center px-4">
      <WaitingClient signupCount={count} poolCode={profile.dating_pool} />
    </div>
  )
}
