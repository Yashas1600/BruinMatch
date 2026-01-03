'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="max-w-md mx-auto mb-4 relative flex justify-end items-center">
      <Link href="/swipe" className="absolute left-1/2 transform -translate-x-1/2">
        <h1 className="text-2xl font-bold text-gray-900">PFC Match</h1>
      </Link>
      {pathname === '/preferences' && (
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-white rounded-full shadow hover:shadow-md transition text-gray-700 font-medium"
        >
          Log out
        </button>
      )}
    </div>
  )
}
