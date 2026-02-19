'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type PoolStatus = 'waiting' | 'active' | 'paused'

export async function getPoolStatus(poolCode: string): Promise<PoolStatus | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('pool_config')
    .select('status')
    .eq('pool_code', poolCode)
    .single()
  return (data?.status as PoolStatus) ?? null
}

export async function getSignupCount(poolCode: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('dating_pool', poolCode)
  return count ?? 0
}

/** Get pool status for the currently authenticated user (their profile's pool). */
export async function getPoolStatusForCurrentUser(): Promise<{
  status: PoolStatus
  poolCode: string
} | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('dating_pool')
    .eq('id', user.id)
    .single()
  if (!profile) return null
  const status = await getPoolStatus(profile.dating_pool)
  if (!status) return null
  return { status, poolCode: profile.dating_pool }
}

/** For onboarding: is this pool code valid? (in pool_config OR at least one profile has it) */
export async function isPoolCodeValid(poolCode: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: config } = await supabase
    .from('pool_config')
    .select('pool_code')
    .eq('pool_code', poolCode)
    .single()
  if (config) return true
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('dating_pool', poolCode)
  return (count ?? 0) > 0
}

/** Admin only: set pool status. Uses service role so it can update pool_config. */
export async function setPoolStatus(
  poolCode: string,
  status: PoolStatus
): Promise<{ success: boolean; error?: string }> {
  const { isAdminAuthenticated } = await import('@/app/actions/admin')
  if (!(await isAdminAuthenticated())) {
    return { success: false, error: 'Unauthorized' }
  }
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { error } = await supabase
    .from('pool_config')
    .upsert(
      { pool_code: poolCode, status, updated_at: new Date().toISOString() },
      { onConflict: 'pool_code' }
    )
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin')
  revalidatePath('/swipe')
  revalidatePath('/waiting')
  revalidatePath('/paused')
  return { success: true }
}
