import { redirect } from 'next/navigation'
import { isAdminAuthenticated, adminLogout } from '@/app/actions/admin'
import { createClient } from '@/lib/supabase/server'
import AdminDashboardClient from './AdminDashboardClient'

async function getAdminStats() {
  // Use service role key to bypass RLS and see all data
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  // Get total users
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  // Get finalized users
  const { count: finalizedUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_finalized', true)

  // Get total matches
  const { count: totalMatches } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })

  // Get total messages
  const { count: totalMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })

  // Get all profiles
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, name, email, age, gender, frat, is_finalized, dating_pool, created_at')
    .order('created_at', { ascending: false })

  // Get all swipes
  const { data: allSwipes } = await supabase
    .from('swipes')
    .select('swiper, swipee, decision')
    .eq('decision', 'like')

  // Get all matches with profile names
  const { data: allMatches } = await supabase
    .from('matches')
    .select('user_a, user_b')

  // Build user details with swipes and matches
  const profilesWithDetails = allProfiles?.map(profile => {
    // Get users this person liked
    const liked = allSwipes?.filter(s => s.swiper === profile.id).map(s => s.swipee) || []

    // Get matches for this person
    const matches = allMatches?.filter(
      m => m.user_a === profile.id || m.user_b === profile.id
    ).map(m => m.user_a === profile.id ? m.user_b : m.user_a) || []

    // Get names for liked users
    const likedNames = liked.map(id => {
      const likedProfile = allProfiles?.find(p => p.id === id)
      return likedProfile?.name || 'Unknown'
    })

    // Get names for matched users
    const matchedNames = matches.map(id => {
      const matchedProfile = allProfiles?.find(p => p.id === id)
      return matchedProfile?.name || 'Unknown'
    })

    return {
      ...profile,
      liked: likedNames,
      matches: matchedNames,
    }
  }) || []

  // Get unique dating pools
  const datingPools = [...new Set(allProfiles?.map(p => p.dating_pool) || [])]

  // Get pool config (status per pool)
  const { data: poolConfigs } = await supabase
    .from('pool_config')
    .select('pool_code, status')

  return {
    totalUsers: totalUsers || 0,
    finalizedUsers: finalizedUsers || 0,
    activeUsers: (totalUsers || 0) - (finalizedUsers || 0),
    totalMatches: totalMatches || 0,
    totalMessages: totalMessages || 0,
    allProfiles: profilesWithDetails,
    datingPools: datingPools,
    poolConfigs: (poolConfigs || []).map(pc => ({
      ...pc,
      signupCount: allProfiles?.filter(p => p.dating_pool === pc.pool_code).length ?? 0,
    })),
  }
}

async function LogoutButton() {
  async function handleLogout() {
    'use server'
    await adminLogout()
    redirect('/auth/login')
  }

  return (
    <form action={handleLogout}>
      <button
        type="submit"
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
      >
        Logout
      </button>
    </form>
  )
}

export default async function AdminDashboard() {
  const isAuthenticated = await isAdminAuthenticated()

  if (!isAuthenticated) {
    redirect('/admin/login')
  }

  const stats = await getAdminStats()

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminDashboardClient
          allProfiles={stats.allProfiles}
          datingPools={stats.datingPools}
          poolConfigs={stats.poolConfigs}
          totalUsers={stats.totalUsers}
          activeUsers={stats.activeUsers}
          finalizedUsers={stats.finalizedUsers}
          totalMatches={stats.totalMatches}
          totalMessages={stats.totalMessages}
        />
      </main>
    </div>
  )
}
