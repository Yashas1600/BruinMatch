import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPoolStatus, getSignupCount } from '@/app/actions/pool'
import Header from '@/components/Header'
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
    <div className="min-h-screen bg-pink-500 pt-4 px-4 pb-8">
      <Header />
      <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
        <WaitingClient signupCount={count} poolCode={profile.dating_pool} />
      </div>
    </div>
  )
}
