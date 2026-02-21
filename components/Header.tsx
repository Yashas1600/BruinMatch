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

  const logOutButton = (
    <button
      onClick={handleLogout}
      className="px-3 py-2 text-sm font-medium bg-white/90 text-gray-900 hover:bg-white rounded-lg transition shadow-sm"
    >
      Log out
    </button>
  )

  return (
    <div className="max-w-md mx-auto mb-4 relative flex items-center justify-between px-4">
      {pathname === '/swipe' ? (
        <>
          <div className="w-16" />
          <h1 className="text-lg font-bold text-foreground tracking-tight">Discover</h1>
          <div className="flex justify-end w-16">{logOutButton}</div>
        </>
      ) : (
        <>
          <Link href="/" className="flex items-center gap-2">
            <EightBallLogo size={32} />
            <h1 className="text-xl font-bold text-foreground tracking-tight">Pool</h1>
          </Link>
          {logOutButton}
        </>
      )}
    </div>
  )
}
