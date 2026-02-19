'use client'

import { useState, useMemo } from 'react'
import { setPoolStatus, type PoolStatus } from '@/app/actions/pool'

interface Profile {
  id: string
  name: string
  email: string
  age: number
  gender: string
  frat: string
  is_finalized: boolean
  dating_pool: string
  created_at: string
  liked: string[]
  matches: string[]
}

interface PoolConfig {
  pool_code: string
  status: string
  signupCount: number
}

interface AdminDashboardClientProps {
  allProfiles: Profile[]
  datingPools: string[]
  poolConfigs: PoolConfig[]
  totalUsers: number
  activeUsers: number
  finalizedUsers: number
  totalMatches: number
  totalMessages: number
}

type SortField = 'name' | 'age' | 'gender' | 'frat' | 'is_finalized' | 'created_at'
type SortDirection = 'asc' | 'desc'

export default function AdminDashboardClient({
  allProfiles,
  datingPools,
  poolConfigs,
  totalUsers,
  activeUsers,
  finalizedUsers,
  totalMatches,
  totalMessages,
}: AdminDashboardClientProps) {
  const [selectedPool, setSelectedPool] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [poolActionLoading, setPoolActionLoading] = useState<string | null>(null)

  const handlePoolAction = async (poolCode: string, status: PoolStatus) => {
    setPoolActionLoading(poolCode)
    await setPoolStatus(poolCode, status)
    setPoolActionLoading(null)
    window.location.reload()
  }

  // Filter profiles based on selected pool
  const filteredProfiles = selectedPool === 'all'
    ? allProfiles
    : allProfiles.filter(p => p.dating_pool === selectedPool)

  // Sort profiles
  const sortedProfiles = useMemo(() => {
    return [...filteredProfiles].sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (sortField === 'created_at') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      } else if (sortField === 'is_finalized') {
        aVal = a.is_finalized ? 1 : 0
        bVal = b.is_finalized ? 1 : 0
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredProfiles, sortField, sortDirection])

  // Calculate stats for selected pool
  const poolStats = {
    total: filteredProfiles.length,
    active: filteredProfiles.filter(p => !p.is_finalized).length,
    finalized: filteredProfiles.filter(p => p.is_finalized).length,
  }

  // Group profiles by dating pool for stats
  const poolCounts = datingPools.map(pool => ({
    pool,
    count: allProfiles.filter(p => p.dating_pool === pool).length,
  }))

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-400">↕</span>
    return sortDirection === 'asc' ? <span>↑</span> : <span>↓</span>
  }

  return (
    <>
      {/* Pool controls */}
      {poolConfigs.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Pool controls</h2>
          <p className="text-gray-600 text-sm mb-4">
            Start the pool to open matching. Pause to hide new profiles and show a &quot;Matching
            paused&quot; screen.
          </p>
          <div className="space-y-4">
            {poolConfigs.map((pc) => (
              <div
                key={pc.pool_code}
                className="flex flex-wrap items-center gap-4 p-4 border border-gray-200 rounded-lg"
              >
                <div>
                  <span className="font-medium text-gray-900">{pc.pool_code}</span>
                  <span className="ml-2 text-gray-500">
                    ({pc.signupCount} signed up · {pc.status})
                  </span>
                </div>
                <div className="flex gap-2">
                  {pc.status === 'waiting' && (
                    <button
                      onClick={() => handlePoolAction(pc.pool_code, 'active')}
                      disabled={poolActionLoading === pc.pool_code}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {poolActionLoading === pc.pool_code ? '…' : 'Start pool'}
                    </button>
                  )}
                  {pc.status === 'active' && (
                    <button
                      onClick={() => handlePoolAction(pc.pool_code, 'paused')}
                      disabled={poolActionLoading === pc.pool_code}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                    >
                      {poolActionLoading === pc.pool_code ? '…' : 'Pause matching'}
                    </button>
                  )}
                  {pc.status === 'paused' && (
                    <button
                      onClick={() => handlePoolAction(pc.pool_code, 'active')}
                      disabled={poolActionLoading === pc.pool_code}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {poolActionLoading === pc.pool_code ? '…' : 'Resume matching'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Total Users</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {selectedPool === 'all' ? totalUsers : poolStats.total}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Active Users</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {selectedPool === 'all' ? activeUsers : poolStats.active}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Finalized Users</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {selectedPool === 'all' ? finalizedUsers : poolStats.finalized}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Total Matches</h3>
          <p className="text-3xl font-bold text-pink-600 mt-2">{totalMatches}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Total Messages</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">{totalMessages}</p>
        </div>
      </div>

      {/* Dating Pools Tabs */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            <button
              onClick={() => setSelectedPool('all')}
              className={`px-6 py-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                selectedPool === 'all'
                  ? 'border-pink-500 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Pools ({allProfiles.length})
            </button>
            {datingPools.map(pool => {
              const count = allProfiles.filter(p => p.dating_pool === pool).length
              return (
                <button
                  key={pool}
                  onClick={() => setSelectedPool(pool)}
                  className={`px-6 py-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                    selectedPool === pool
                      ? 'border-pink-500 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {pool} ({count})
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Users {selectedPool !== 'all' && `in ${selectedPool}`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    Name <SortIcon field="name" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th
                  onClick={() => handleSort('age')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    Age <SortIcon field="age" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('gender')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    Gender <SortIcon field="gender" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('frat')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    Frat/Sorority <SortIcon field="frat" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Liked
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Matches
                </th>
                <th
                  onClick={() => handleSort('is_finalized')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    Status <SortIcon field="is_finalized" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedProfiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {profile.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {profile.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {profile.age}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {profile.gender}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {profile.frat}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {profile.liked.length > 0 ? (
                      <div className="max-w-xs">
                        {profile.liked.join(', ')}
                      </div>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {profile.matches.length > 0 ? (
                      <div className="max-w-xs font-semibold text-pink-600">
                        {profile.matches.join(', ')}
                      </div>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        profile.is_finalized
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {profile.is_finalized ? 'Finalized' : 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
