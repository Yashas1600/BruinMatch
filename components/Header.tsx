'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import EightBallLogo from './EightBallLogo'

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="max-w-md mx-auto mb-4 relative flex items-center justify-between px-4">
      {pathname === '/swipe' ? (
        <>
          <button className="p-2 hover:bg-white/20 rounded-full transition">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-white">Discover</h1>
          <button className="p-2 hover:bg-white/20 rounded-full transition">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
            </svg>
          </button>
        </>
      ) : (
        <>
          <Link href="/swipe" className="flex items-center gap-2">
            <EightBallLogo size={32} />
            <h1 className="text-2xl font-bold text-white">Pool</h1>
          </Link>
          {pathname === '/preferences' && (
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white rounded-full shadow hover:shadow-md transition text-gray-700 font-medium"
            >
              Log out
            </button>
          )}
        </>
      )}
    </div>
  )
}
