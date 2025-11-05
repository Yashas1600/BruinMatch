import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugMatch(userName: string) {
  console.log(`\n🔍 Debugging match for user: ${userName}\n`)

  // Find the user by name
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .ilike('name', `%${userName}%`)

  if (profileError) {
    console.error('Error finding user:', profileError)
    return
  }

  if (!profiles || profiles.length === 0) {
    console.log('❌ User not found')
    return
  }

  console.log(`✅ Found ${profiles.length} user(s):`)
  profiles.forEach(p => {
    console.log(`  - ${p.name} (${p.id})`)
  })

  const userId = profiles[0].id
  console.log(`\nChecking matches for: ${profiles[0].name}`)

  // Get all matches
  const { data: matches, error: matchError } = await supabase
    .from('matches')
    .select('*')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)

  if (matchError) {
    console.error('Error finding matches:', matchError)
    return
  }

  console.log(`\n📊 Found ${matches?.length || 0} match(es)`)

  if (matches && matches.length > 0) {
    for (const match of matches) {
      console.log(`\n  Match ID: ${match.id}`)
      console.log(`  User A: ${match.user_a}`)
      console.log(`  User B: ${match.user_b}`)
      console.log(`  Created: ${match.created_at}`)

      // Check if chat exists
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('match_id', match.id)
        .single()

      if (chatError) {
        console.log(`  ❌ No chat found for this match!`)
        console.log(`  Error: ${chatError.message}`)
      } else if (chat) {
        console.log(`  ✅ Chat ID: ${chat.id}`)
      }
    }
  }

  // Get current user's swipes
  const { data: swipes } = await supabase
    .from('swipes')
    .select('*')
    .eq('swiper', userId)

  console.log(`\n📝 User has made ${swipes?.length || 0} swipe(s)`)
}

const userName = process.argv[2]
if (!userName) {
  console.log('Usage: npx tsx scripts/debug-match.ts <username>')
  process.exit(1)
}

debugMatch(userName)
