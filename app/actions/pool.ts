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

/** For onboarding: is this pool code valid? Must exist in pool_config. Case-insensitive. */
export async function isPoolCodeValid(poolCode: string): Promise<boolean> {
  const normalized = poolCode.trim().toLowerCase()
  if (!normalized) return false
  const supabase = await createClient()
  const { data: configs } = await supabase.from('pool_config').select('pool_code')
  const validCodes = new Set((configs ?? []).map((c) => c.pool_code.toLowerCase()))
  return validCodes.has(normalized)
}

export async function getDisplayCount(poolCode: string): Promise<number> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('pool_config')
    .select('display_count')
    .eq('pool_code', poolCode)
    .single()
  return data?.display_count ?? 0
}

/** Admin only: set the fake display count shown on the waiting page. */
export async function setDisplayCount(
  poolCode: string,
  displayCount: number
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
    .update({ display_count: displayCount })
    .eq('pool_code', poolCode)
  if (error) return { success: false, error: error.message }
  return { success: true }
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
