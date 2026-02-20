'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Message, Profile } from '@/lib/supabase/database.types'
import { sendMessage, confirmDate, getChatInfo } from '@/app/actions/chat'
import { formatRelativeTime } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted text-sm">Loading chat...</p>
        </div>
      </div>
    )
  }

  const photos = (otherProfile.photos as string[]) || []

  return (
    <>
      <div className="h-screen bg-background flex flex-col pb-16">
        {/* Header */}
        <div className="bg-white px-4 py-3 flex items-center gap-3 shadow-soft">
          <Link href="/matches">
            <button className="p-1.5 hover:bg-primary-50 rounded-full transition">
              <svg
                className="w-5 h-5 text-foreground"
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

          <Link href={`/profile/${otherProfile.id}`} className="flex items-center gap-3 flex-1 hover:opacity-80 transition">
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
              <h2 className="font-semibold text-foreground text-sm">{otherProfile.name}</h2>
              {bothConfirmed ? (
                <p className="text-[10px] text-emerald-500 font-medium">✓ PFC Date Confirmed!</p>
              ) : otherConfirmed ? (
                <p className="text-[10px] text-primary-500">Waiting for your confirmation...</p>
              ) : userConfirmed ? (
                <p className="text-[10px] text-primary-500">Waiting for {otherProfile.name}...</p>
              ) : (
                <p className="text-[10px] text-muted">{otherProfile.frat}</p>
              )}
            </div>
          </Link>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((message) => {
            const isOwn = message.sender === currentUserId
            return (
              <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] px-4 py-2.5 ${
                    isOwn
                      ? 'bg-primary-500 text-white rounded-2xl rounded-br-md'
                      : 'bg-white text-foreground rounded-2xl rounded-bl-md shadow-soft'
                  }`}
                >
                  <p className="break-words text-sm">{message.body}</p>
                  <p
                    className={`text-[10px] mt-1 ${isOwn ? 'text-white/60' : 'text-muted'}`}
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
          <div className="px-4 py-3 bg-primary-50 border-t border-primary-100">
            {bothConfirmed ? (
              <div className="text-center">
                <p className="text-emerald-600 font-semibold text-sm mb-1">
                  🎉 Both of you confirmed! You&apos;re all set for PFC!
                </p>
                <p className="text-xs text-muted">
                  You both have been removed from the swipe pool.
                </p>
              </div>
            ) : userConfirmed ? (
              <p className="text-center text-primary-600 text-xs font-medium">
                You confirmed! Waiting for {otherProfile.name} to confirm...
              </p>
            ) : otherConfirmed ? (
              <div className="text-center">
                <p className="text-primary-600 text-xs mb-2">
                  {otherProfile.name} wants to confirm you as their PFC date!
                </p>
                <button
                  onClick={handleConfirmDate}
                  disabled={confirming}
                  className="bg-primary-500 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-primary-dark transition disabled:opacity-50 shadow-action"
                >
                  {confirming ? 'Confirming...' : 'Confirm PFC Date'}
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-muted text-xs mb-2">
                  Ready to make this official? Confirm your PFC date!
                </p>
                <button
                  onClick={handleConfirmDate}
                  disabled={confirming}
                  className="bg-primary-500 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-primary-dark transition disabled:opacity-50 shadow-action"
                >
                  {confirming ? 'Confirming...' : 'Confirm PFC Date'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="bg-white px-4 py-3 border-t border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={sending || bothConfirmed}
              className="flex-1 px-4 py-2.5 bg-background border border-border rounded-full focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none disabled:bg-gray-50 text-foreground text-sm placeholder:text-gray-300"
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim() || bothConfirmed}
              className="bg-primary-500 text-white w-10 h-10 rounded-full font-semibold hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
          {bothConfirmed && (
            <p className="text-[10px] text-muted text-center mt-2">
              Chat is locked after confirmation
            </p>
          )}
        </form>
      </div>

      <BottomNav />
    </>
  )
}
