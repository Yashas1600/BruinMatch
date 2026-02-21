'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { getPoolStatus } from '@/app/actions/pool'

export default function PausedClient({ poolCode }: { poolCode: string }) {
  useEffect(() => {
    const interval = setInterval(async () => {
      const status = await getPoolStatus(poolCode)
      if (status === 'active') window.location.href = '/swipe'
      if (status === 'waiting') window.location.href = '/waiting'
    }, 5000)
    return () => clearInterval(interval)
  }, [poolCode])

  return (
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
      <div className="text-5xl mb-4">⏸</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Matching has been paused</h1>
      <p className="text-gray-600">
        New profiles aren&apos;t visible right now. Check back later—we&apos;ll resume matching
        soon.
      </p>
      <p className="text-sm text-gray-500 mt-6">
        This page will update automatically when matching resumes.
      </p>
      <Link
        href="/preferences"
        className="mt-6 inline-block px-6 py-3 bg-gray-100 text-gray-800 rounded-lg font-medium hover:bg-gray-200 transition"
      >
        Edit your profile
      </Link>
    </div>
  )
}
