'use client'

import { useState, useEffect, useRef } from 'react'
import { getDisplayCount, getPoolStatus } from '@/app/actions/pool'
import Link from 'next/link'

// Set to false to disable the auto-increment entirely
const FAKE_BUMP_ENABLED = true

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export default function WaitingClient({
  displayCount: initialCount,
  poolCode,
}: {
  displayCount: number
  poolCode: string
}) {
  const [count, setCount] = useState(initialCount)
  const pollCountRef = useRef(0)
  const bumpThresholdRef = useRef(randomInt(3, 5))

  useEffect(() => {
    const interval = setInterval(async () => {
      const [newDisplayCount, status] = await Promise.all([
        getDisplayCount(poolCode),
        getPoolStatus(poolCode),
      ])

      // Always sync to the admin-set value as the floor
      setCount(prev => {
        pollCountRef.current += 1

        let next = Math.max(prev, newDisplayCount)

        if (FAKE_BUMP_ENABLED && pollCountRef.current >= bumpThresholdRef.current) {
          next += 1
          pollCountRef.current = 0
          bumpThresholdRef.current = randomInt(3, 5)
        }

        return next
      })

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
      <div className="bg-pink-50 rounded-xl p-6 mb-6">
        <p className="text-5xl font-bold text-pink-600">{count}</p>
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
        className="mt-6 inline-block text-pink-600 hover:text-pink-700 font-medium"
      >
        Refresh
      </Link>
    </div>
  )
}
