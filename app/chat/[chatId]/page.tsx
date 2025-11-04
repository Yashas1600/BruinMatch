'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Message, Profile } from '@/lib/supabase/database.types'
import { sendMessage, confirmDate, getChatInfo } from '@/app/actions/chat'
import { formatRelativeTime } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const chatId = params.chatId as string
  const supabase = createClient()

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null)
  const [matchId, setMatchId] = useState<string>('')
  const [userConfirmed, setUserConfirmed] = useState(false)
  const [otherConfirmed, setOtherConfirmed] = useState(false)
  const [bothConfirmed, setBothConfirmed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadChatInfo()
    loadMessages()
    subscribeToMessages()
  }, [chatId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadChatInfo = async () => {
    const result = await getChatInfo(chatId)
    if (result.success) {
      setOtherProfile(result.otherProfile!)
      setMatchId(result.matchId!)
      setUserConfirmed(result.userConfirmed!)
      setOtherConfirmed(result.otherConfirmed!)
      setBothConfirmed(result.bothConfirmed!)
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) setCurrentUserId(user.id)
  }

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setMessages(data)
    }
  }

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    const messageText = newMessage.trim()

    // Optimistic update - show message immediately
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      chat_id: chatId,
      sender: currentUserId,
      body: messageText,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempMessage])
    setNewMessage('')

    const result = await sendMessage(chatId, messageText)
    if (!result.success) {
      // Remove optimistic message if send failed
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id))
      setNewMessage(messageText)
    }
    setSending(false)
  }

  const handleConfirmDate = async () => {
    if (confirming || userConfirmed) return

    setConfirming(true)
    const result = await confirmDate(matchId)
    if (result.success) {
      setUserConfirmed(true)
      if (result.bothConfirmed) {
        setBothConfirmed(true)
      }
    }
    setConfirming(false)
  }

  if (!otherProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    )
  }

  const photos = (otherProfile.photos as string[]) || []

  return (
    <div className="h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-md px-4 py-3 flex items-center gap-4">
        <Link href="/matches">
          <button className="p-2 hover:bg-gray-100 rounded-full transition">
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </Link>

        <Link href={`/profile/${otherProfile.id}`} className="flex items-center gap-4 flex-1 hover:opacity-80 transition">
          <div className="relative w-10 h-10 flex-shrink-0">
            {photos[0] && (
              <Image
                src={photos[0]}
                alt={otherProfile.name}
                fill
                className="object-cover rounded-full"
              />
            )}
          </div>

          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">{otherProfile.name}</h2>
            {bothConfirmed ? (
              <p className="text-xs text-green-600 font-medium">✓ PFC Date Confirmed!</p>
            ) : otherConfirmed ? (
              <p className="text-xs text-purple-600">Waiting for your confirmation...</p>
            ) : userConfirmed ? (
              <p className="text-xs text-purple-600">Waiting for {otherProfile.name}...</p>
            ) : (
              <p className="text-xs text-gray-500">{otherProfile.frat}</p>
            )}
          </div>
        </Link>

        <button
          onClick={async () => {
            await supabase.auth.signOut()
            router.push('/auth/login')
          }}
          className="p-2 hover:bg-gray-100 rounded-full transition"
        >
          <svg
            className="w-6 h-6 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => {
          const isOwn = message.sender === currentUserId
          return (
            <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  isOwn
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                    : 'bg-white text-gray-900'
                }`}
              >
                <p className="break-words">{message.body}</p>
                <p
                  className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-gray-500'}`}
                >
                  {formatRelativeTime(message.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Confirmation Banner */}
      {!bothConfirmed && (
        <div className="px-4 py-3 bg-purple-50 border-t border-purple-100">
          {bothConfirmed ? (
            <div className="text-center">
              <p className="text-green-600 font-semibold mb-1">
                🎉 Both of you confirmed! You're all set for PFC!
              </p>
              <p className="text-sm text-gray-600">
                You both have been removed from the swipe pool.
              </p>
            </div>
          ) : userConfirmed ? (
            <p className="text-center text-purple-700 text-sm">
              You confirmed! Waiting for {otherProfile.name} to confirm...
            </p>
          ) : otherConfirmed ? (
            <div className="text-center">
              <p className="text-purple-700 text-sm mb-2">
                {otherProfile.name} wants to confirm you as their PFC date!
              </p>
              <button
                onClick={handleConfirmDate}
                disabled={confirming}
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-2 rounded-full font-semibold hover:from-pink-600 hover:to-purple-600 transition disabled:opacity-50"
              >
                {confirming ? 'Confirming...' : 'Confirm PFC Date'}
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-2">
                Ready to make this official? Confirm your PFC date!
              </p>
              <button
                onClick={handleConfirmDate}
                disabled={confirming}
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-2 rounded-full font-semibold hover:from-pink-600 hover:to-purple-600 transition disabled:opacity-50"
              >
                {confirming ? 'Confirming...' : 'Confirm PFC Date'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="bg-white px-4 py-3 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending || bothConfirmed}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none disabled:bg-gray-100 text-gray-900"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim() || bothConfirmed}
            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-2 rounded-full font-semibold hover:from-pink-600 hover:to-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        {bothConfirmed && (
          <p className="text-xs text-gray-500 text-center mt-2">
            Chat is locked after confirmation
          </p>
        )}
      </form>
    </div>
  )
}
