'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-md mx-auto flex justify-around items-center py-3 px-6">
        {/* Home Icon */}
        <Link href="/swipe" className="flex flex-col items-center gap-1 group">
          <div className={`p-2 rounded-full transition ${
            pathname === '/swipe'
              ? 'bg-pink-100'
              : 'hover:bg-gray-100'
          }`}>
            <svg
              className={`w-7 h-7 transition ${
                pathname === '/swipe'
                  ? 'text-pink-500'
                  : 'text-gray-400 group-hover:text-gray-600'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
          </div>
        </Link>

        {/* Chat Icon */}
        <Link href="/matches" className="flex flex-col items-center gap-1 group">
          <div className={`p-2 rounded-full transition ${
            pathname === '/matches'
              ? 'bg-pink-100'
              : 'hover:bg-gray-100'
          }`}>
            <svg
              className={`w-7 h-7 transition ${
                pathname === '/matches'
                  ? 'text-pink-500'
                  : 'text-gray-400 group-hover:text-gray-600'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
          </div>
        </Link>

        {/* Profile Icon */}
        <Link href="/preferences" className="flex flex-col items-center gap-1 group">
          <div className={`p-2 rounded-full transition ${
            pathname === '/preferences'
              ? 'bg-pink-100'
              : 'hover:bg-gray-100'
          }`}>
            <svg
              className={`w-7 h-7 transition ${
                pathname === '/preferences'
                  ? 'text-pink-500'
                  : 'text-gray-400 group-hover:text-gray-600'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
        </Link>
      </div>
    </nav>
  )
}
