import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function createManualMatch(user1Email: string, user2Email: string) {
  console.log(`\n🔧 Creating manual match between ${user1Email} and ${user2Email}...\n`)

  // Find users
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('email', [user1Email, user2Email])

  if (profileError || !profiles || profiles.length !== 2) {
    console.error('Error finding users:', profileError)
    return
  }

  const user1 = profiles[0]
  const user2 = profiles[1]

  console.log(`Found users:`)
  console.log(`  - ${user1.name} (${user1.email})`)
  console.log(`  - ${user2.name} (${user2.email})`)

  // Create swipes for both users
  console.log('\nCreating swipes...')

  const { error: swipe1Error } = await supabase
    .from('swipes')
    .insert({
      swiper: user1.id,
      swipee: user2.id,
      decision: 'like'
    })

  if (swipe1Error) {
    console.error(`  ❌ Error creating swipe from ${user1.name}:`, swipe1Error.message)
  } else {
    console.log(`  ✅ ${user1.name} → ${user2.name}`)
  }

  const { error: swipe2Error } = await supabase
    .from('swipes')
    .insert({
      swiper: user2.id,
      swipee: user1.id,
      decision: 'like'
    })

  if (swipe2Error) {
    console.error(`  ❌ Error creating swipe from ${user2.name}:`, swipe2Error.message)
  } else {
    console.log(`  ✅ ${user2.name} → ${user1.name}`)
  }

  // Create match
  console.log('\nCreating match...')
  const [userA, userB] = [user1.id, user2.id].sort()

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      user_a: userA,
      user_b: userB
    })
    .select()
    .single()

  if (matchError) {
    console.error('  ❌ Error creating match:', matchError.message)
    return
  }

  console.log(`  ✅ Match created: ${match.id}`)

  // Check if chat was auto-created
  console.log('\nChecking for chat...')
  await new Promise(resolve => setTimeout(resolve, 1000)) // Wait for trigger

  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .select('*')
    .eq('match_id', match.id)
    .single()

  if (chatError) {
    console.log('  ❌ No chat found, creating manually...')
    const { data: newChat, error: createChatError } = await supabase
      .from('chats')
      .insert({ match_id: match.id })
      .select()
      .single()

    if (createChatError) {
      console.error('  ❌ Error creating chat:', createChatError.message)
    } else {
      console.log(`  ✅ Chat created: ${newChat.id}`)
    }
  } else {
    console.log(`  ✅ Chat exists: ${chat.id}`)
  }

  console.log('\n✅ Done! Users should now see each other in matches.')
}

const user1 = process.argv[2]
const user2 = process.argv[3]

if (!user1 || !user2) {
  console.log('Usage: npx tsx scripts/create-manual-match.ts <user1-email> <user2-email>')
  process.exit(1)
}

createManualMatch(user1, user2)
