'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white z-50" style={{ boxShadow: '0 -1px 12px rgba(0,0,0,0.06)' }}>
      <div className="max-w-md mx-auto flex justify-around items-center py-2 px-6">
        {/* Home / Swipe */}
        <Link href="/swipe" className="flex flex-col items-center gap-0.5 py-1 px-3">
          <svg
            className={`w-6 h-6 transition-colors ${
              pathname === '/swipe' ? 'text-primary-500' : 'text-gray-300'
            }`}
            fill={pathname === '/swipe' ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={pathname === '/swipe' ? 0 : 1.8}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
          <span className={`text-[10px] font-medium ${
            pathname === '/swipe' ? 'text-primary-500' : 'text-gray-400'
          }`}>Discover</span>
        </Link>

        {/* Chat / Matches */}
        <Link href="/matches" className="flex flex-col items-center gap-0.5 py-1 px-3">
          <svg
            className={`w-6 h-6 transition-colors ${
              pathname === '/matches' ? 'text-primary-500' : 'text-gray-300'
            }`}
            fill={pathname === '/matches' ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={pathname === '/matches' ? 0 : 1.8}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
            />
          </svg>
          <span className={`text-[10px] font-medium ${
            pathname === '/matches' ? 'text-primary-500' : 'text-gray-400'
          }`}>Matches</span>
        </Link>

        {/* Profile / Preferences */}
        <Link href="/preferences" className="flex flex-col items-center gap-0.5 py-1 px-3">
          <svg
            className={`w-6 h-6 transition-colors ${
              pathname === '/preferences' ? 'text-primary-500' : 'text-gray-300'
            }`}
            fill={pathname === '/preferences' ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={pathname === '/preferences' ? 0 : 1.8}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </svg>
          <span className={`text-[10px] font-medium ${
            pathname === '/preferences' ? 'text-primary-500' : 'text-gray-400'
          }`}>Profile</span>
        </Link>
      </div>
    </nav>
  )
}
