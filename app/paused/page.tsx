import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPoolStatus } from '@/app/actions/pool'
import PausedClient from './PausedClient'

export default async function PausedPage() {
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
  if (status === 'active') redirect('/swipe')
  if (status === 'waiting') redirect('/waiting')

  return (
    <div className="min-h-screen bg-blush-500 flex items-center justify-center px-4">
      <PausedClient poolCode={profile.dating_pool} />
    </div>
  )
}
