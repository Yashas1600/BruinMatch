'use server'

import { createClient } from '@/lib/supabase/server'

/** Permanently delete the current user's account and all their data. */
export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
