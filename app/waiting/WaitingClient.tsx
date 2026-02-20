'use client'

import { useState, useEffect } from 'react'
import { getSignupCount, getPoolStatus } from '@/app/actions/pool'
import Link from 'next/link'

export default function WaitingClient({
  signupCount: initialCount,
  poolCode,
}: {
  signupCount: number
  poolCode: string
}) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    const interval = setInterval(async () => {
      const [newCount, status] = await Promise.all([
        getSignupCount(poolCode),
        getPoolStatus(poolCode),
      ])
      setCount(newCount)
      if (status === 'active') window.location.href = '/swipe'
      if (status === 'paused') window.location.href = '/paused'
    }, 5000)
    return () => clearInterval(interval)
  }, [poolCode])

  return (
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">You&apos;re in the pool</h1>
      <p className="text-gray-600 mb-6">
        The admin has not started your pool yet. You&apos;ll be able to match once they turn it on.
      </p>
      <div className="bg-blush-50 rounded-xl p-6 mb-6">
        <p className="text-5xl font-bold text-blush-600">{count}</p>
        <p className="text-gray-600 mt-1">
          {count === 1 ? 'person has' : 'people have'} signed up
        </p>
      </div>
      <p className="text-sm text-gray-500">
        This page updates every few seconds. When the admin starts your pool, you&apos;ll be able to
        start matching.
      </p>
      <Link
        href="/waiting"
        className="mt-6 inline-block text-blush-600 hover:text-blush-700 font-medium"
      >
        Refresh
      </Link>
    </div>
  )
}
