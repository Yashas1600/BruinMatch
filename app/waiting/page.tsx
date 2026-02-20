import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPoolStatus, getDisplayCount } from '@/app/actions/pool'
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
  const displayCount = await getDisplayCount(profile.dating_pool)

  if (status === 'active') redirect('/swipe')
  if (status === 'paused') redirect('/paused')

  return (
    <div className="min-h-screen bg-pink-500 flex items-center justify-center px-4">
      <WaitingClient displayCount={displayCount} poolCode={profile.dating_pool} />
    </div>
  )
}
