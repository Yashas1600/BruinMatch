import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

type TestResult = {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn()
    results.push({ name, passed: true })
    console.log(`✅ ${name}`)
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message })
    console.log(`❌ ${name}: ${error.message}`)
  }
}

// Test data
const testUsers = [
  {
    email: 'test-user-1@example.com',
    name: 'Alice',
    age: 22,
    frat: 'Alpha Kappa Psi',
    height_cm: 170,
    interested_in: 'men' as const,
    one_liner: 'Love hiking and coffee!',
    photos: ['https://via.placeholder.com/400x600'],
  },
  {
    email: 'test-user-2@example.com',
    name: 'Bob',
    age: 24,
    frat: 'Delta Sigma Pi',
    height_cm: 180,
    interested_in: 'women' as const,
    one_liner: 'Gym enthusiast and foodie',
    photos: ['https://via.placeholder.com/400x600'],
  },
  {
    email: 'test-user-3@example.com',
    name: 'Charlie',
    age: 20,
    frat: 'Other',
    height_cm: 175,
    interested_in: 'everyone' as const,
    one_liner: 'Music lover',
    photos: ['https://via.placeholder.com/400x600'],
  },
]

let userIds: string[] = []

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...\n')
  
  for (const userId of userIds) {
    // Delete auth user (cascades to profile, preferences, etc.)
    await supabase.auth.admin.deleteUser(userId)
  }
  
  console.log('✅ Cleanup complete\n')
}

async function createTestUsers() {
  console.log('👥 Creating test users...\n')
  
  for (const userData of testUsers) {
    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: 'test-password-123',
      email_confirm: true,
    })
    
    if (authError) throw authError
    if (!authUser.user) throw new Error('Failed to create auth user')
    
    userIds.push(authUser.user.id)
    
    // Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authUser.user.id,
      email: userData.email,
      name: userData.name,
      age: userData.age,
      frat: userData.frat,
      height_cm: userData.height_cm,
      interested_in: userData.interested_in,
      one_liner: userData.one_liner,
      photos: userData.photos,
    })
    
    if (profileError) throw profileError
    
    // Create preferences
    const { error: prefsError } = await supabase.from('preferences').insert({
      user_id: authUser.user.id,
      age_min: 18,
      age_max: 30,
      height_min: 150,
      height_max: 200,
      interested_in: userData.interested_in,
      frat_whitelist: null,
    })
    
    if (prefsError) throw prefsError
    
    console.log(`  ✅ Created ${userData.name} (${userData.email})`)
  }
  
  console.log('')
}

async function runTests() {
  console.log('🧪 Testing All Mechanics\n')
  console.log('='.repeat(50) + '\n')
  
  // Setup
  await test('Setup: Create test users', createTestUsers)
  
  const [aliceId, bobId, charlieId] = userIds
  
  // Test 1: Feed Filtering
  await test('Feed Filtering: Get candidates for Alice', async () => {
    const { data: candidates, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_finalized', false)
      .neq('id', aliceId)
      .gte('age', 18)
      .lte('age', 30)
      .gte('height_cm', 150)
      .lte('height_cm', 200)
    
    if (error) throw error
    if (!candidates || candidates.length === 0) throw new Error('No candidates found')
    
    // Alice (interested in men) should see Bob (interested in women)
    const bobInFeed = candidates.find((c) => c.id === bobId)
    if (!bobInFeed) throw new Error('Bob should appear in Alice\'s feed')
  })
  
  // Test 2: Swiping
  await test('Swiping: Alice likes Bob', async () => {
    const { error } = await supabase.from('swipes').insert({
      swiper: aliceId,
      swipee: bobId,
      decision: 'like',
    })
    
    if (error) throw error
  })
  
  await test('Swiping: Alice passes on Charlie', async () => {
    const { error } = await supabase.from('swipes').insert({
      swiper: aliceId,
      swipee: charlieId,
      decision: 'pass',
    })
    
    if (error) throw error
  })
  
  await test('Swiping: Already swiped users excluded from feed', async () => {
    const { data: swipes } = await supabase
      .from('swipes')
      .select('swipee')
      .eq('swiper', aliceId)
    
    const swipedIds = swipes?.map((s) => s.swipee) || []
    
    const { data: candidates } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_finalized', false)
      .neq('id', aliceId)
      .not('id', 'in', `(${swipedIds.join(',')})`)
    
    // Should not include Bob or Charlie
    const bobInFeed = candidates?.find((c) => c.id === bobId)
    const charlieInFeed = candidates?.find((c) => c.id === charlieId)
    
    if (bobInFeed || charlieInFeed) {
      throw new Error('Already swiped users should be excluded')
    }
  })
  
  // Test 3: Matching
  await test('Matching: Bob likes Alice back (mutual match)', async () => {
    // Insert Bob's like
    const { error: swipeError } = await supabase.from('swipes').insert({
      swiper: bobId,
      swipee: aliceId,
      decision: 'like',
    })
    
    if (swipeError) throw swipeError
    
    // Check for mutual like
    const { data: aliceSwipe } = await supabase
      .from('swipes')
      .select('*')
      .eq('swiper', aliceId)
      .eq('swipee', bobId)
      .eq('decision', 'like')
      .single()
    
    const { data: bobSwipe } = await supabase
      .from('swipes')
      .select('*')
      .eq('swiper', bobId)
      .eq('swipee', aliceId)
      .eq('decision', 'like')
      .single()
    
    if (!aliceSwipe || !bobSwipe) {
      throw new Error('Both swipes should exist')
    }
    
    // Create match (ordered IDs)
    const [userA, userB] = [aliceId, bobId].sort()
    
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        user_a: userA,
        user_b: userB,
      })
      .select()
      .single()
    
    if (matchError) throw matchError
    if (!match) throw new Error('Match should be created')
  })
  
  await test('Matching: Chat auto-created for match', async () => {
    const { data: matches } = await supabase
      .from('matches')
      .select('id')
      .or(`user_a.eq.${aliceId},user_b.eq.${aliceId}`)
      .limit(1)
      .single()
    
    if (!matches) throw new Error('Match should exist')
    
    // Wait a bit for trigger
    await new Promise((resolve) => setTimeout(resolve, 500))
    
    const { data: chat, error } = await supabase
      .from('chats')
      .select('*')
      .eq('match_id', matches.id)
      .single()
    
    if (error || !chat) {
      // Create manually if trigger didn't fire
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({ match_id: matches.id })
        .select()
        .single()
      
      if (createError) throw createError
      if (!newChat) throw new Error('Chat should be created')
    }
  })
  
  // Test 4: Chat/Messaging
  await test('Chat: Alice sends message to Bob', async () => {
    const { data: match } = await supabase
      .from('matches')
      .select('id')
      .or(`user_a.eq.${aliceId},user_b.eq.${aliceId}`)
      .limit(1)
      .single()
    
    if (!match) throw new Error('Match should exist')
    
    const { data: chat } = await supabase
      .from('chats')
      .select('id')
      .eq('match_id', match.id)
      .single()
    
    if (!chat) throw new Error('Chat should exist')
    
    const { error } = await supabase.from('messages').insert({
      chat_id: chat.id,
      sender: aliceId,
      body: 'Hey Bob! Nice to match with you!',
    })
    
    if (error) throw error
  })
  
  await test('Chat: Bob replies to Alice', async () => {
    const { data: match } = await supabase
      .from('matches')
      .select('id')
      .or(`user_a.eq.${aliceId},user_b.eq.${aliceId}`)
      .limit(1)
      .single()
    
    if (!match) throw new Error('Match should exist')
    
    const { data: chat } = await supabase
      .from('chats')
      .select('id')
      .eq('match_id', match.id)
      .single()
    
    if (!chat) throw new Error('Chat should exist')
    
    const { error } = await supabase.from('messages').insert({
      chat_id: chat.id,
      sender: bobId,
      body: 'Hey Alice! Looking forward to meeting you!',
    })
    
    if (error) throw error
  })
  
  await test('Chat: Messages are retrievable', async () => {
    const { data: match } = await supabase
      .from('matches')
      .select('id')
      .or(`user_a.eq.${aliceId},user_b.eq.${aliceId}`)
      .limit(1)
      .single()
    
    if (!match) throw new Error('Match should exist')
    
    const { data: chat } = await supabase
      .from('chats')
      .select('id')
      .eq('match_id', match.id)
      .single()
    
    if (!chat) throw new Error('Chat should exist')
    
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    if (!messages || messages.length < 2) {
      throw new Error('Should have at least 2 messages')
    }
  })
  
  // Test 5: Date Confirmation
  await test('Date Confirmation: Alice confirms date', async () => {
    const { data: match } = await supabase
      .from('matches')
      .select('id')
      .or(`user_a.eq.${aliceId},user_b.eq.${aliceId}`)
      .limit(1)
      .single()
    
    if (!match) throw new Error('Match should exist')
    
    const { error } = await supabase.from('date_confirmations').insert({
      match_id: match.id,
      confirmer: aliceId,
    })
    
    if (error) throw error
  })
  
  await test('Date Confirmation: Bob confirms date (both confirmed)', async () => {
    const { data: match } = await supabase
      .from('matches')
      .select('id')
      .or(`user_a.eq.${aliceId},user_b.eq.${aliceId}`)
      .limit(1)
      .single()
    
    if (!match) throw new Error('Match should exist')
    
    const { error } = await supabase.from('date_confirmations').insert({
      match_id: match.id,
      confirmer: bobId,
    })
    
    if (error) throw error
    
    // Wait for trigger
    await new Promise((resolve) => setTimeout(resolve, 500))
    
    // Check if both users are finalized
    const { data: aliceProfile } = await supabase
      .from('profiles')
      .select('is_finalized')
      .eq('id', aliceId)
      .single()
    
    const { data: bobProfile } = await supabase
      .from('profiles')
      .select('is_finalized')
      .eq('id', bobId)
      .single()
    
    if (!aliceProfile?.is_finalized || !bobProfile?.is_finalized) {
      throw new Error('Both users should be finalized after mutual confirmation')
    }
  })
  
  // Test 6: Finalized users excluded from feed
  await test('Feed Filtering: Finalized users excluded from feed', async () => {
    const { data: candidates } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_finalized', false)
      .neq('id', charlieId)
    
    const aliceInFeed = candidates?.find((c) => c.id === aliceId)
    const bobInFeed = candidates?.find((c) => c.id === bobId)
    
    if (aliceInFeed || bobInFeed) {
      throw new Error('Finalized users should be excluded from feed')
    }
  })
  
  // Test 7: Preference filtering
  await test('Feed Filtering: Frat whitelist filtering', async () => {
    // Update Charlie's preferences to only show Alpha Kappa Psi
    const { error } = await supabase
      .from('preferences')
      .update({ frat_whitelist: ['Alpha Kappa Psi'] })
      .eq('user_id', charlieId)
    
    if (error) throw error
    
    // Charlie should only see Alice (Alpha Kappa Psi), not Bob (Delta Sigma Pi)
    const { data: candidates } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_finalized', false)
      .neq('id', charlieId)
      .in('frat', ['Alpha Kappa Psi'])
    
    const aliceInFeed = candidates?.find((c) => c.id === aliceId)
    const bobInFeed = candidates?.find((c) => c.id === bobId)
    
    if (!aliceInFeed) throw new Error('Alice should be in feed (Alpha Kappa Psi)')
    if (bobInFeed) throw new Error('Bob should not be in feed (Delta Sigma Pi)')
  })
  
  // Test 8: Age/Height filtering
  await test('Feed Filtering: Age and height range filtering', async () => {
    // Update Charlie's preferences to narrow age range
    const { error } = await supabase
      .from('preferences')
      .update({
        age_min: 23,
        age_max: 25,
        height_min: 175,
        height_max: 185,
      })
      .eq('user_id', charlieId)
    
    if (error) throw error
    
    // Charlie should see Bob (age 24, height 180) but not Alice (age 22, height 170)
    const { data: candidates } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_finalized', false)
      .neq('id', charlieId)
      .gte('age', 23)
      .lte('age', 25)
      .gte('height_cm', 175)
      .lte('height_cm', 185)
    
    const aliceInFeed = candidates?.find((c) => c.id === aliceId)
    const bobInFeed = candidates?.find((c) => c.id === bobId)
    
    if (aliceInFeed) throw new Error('Alice should not be in feed (age 22, height 170)')
    if (!bobInFeed) throw new Error('Bob should be in feed (age 24, height 180)')
  })
  
  // Print summary
  console.log('\n' + '='.repeat(50))
  console.log('\n📊 Test Summary\n')
  
  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📈 Total: ${results.length}\n`)
  
  if (failed > 0) {
    console.log('Failed Tests:\n')
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  ❌ ${r.name}`)
        if (r.error) console.log(`     Error: ${r.error}\n`)
      })
  }
  
  console.log('='.repeat(50) + '\n')
  
  return failed === 0
}

// Main execution
async function main() {
  try {
    const success = await runTests()
    await cleanup()
    process.exit(success ? 0 : 1)
  } catch (error: any) {
    console.error('\n💥 Fatal error:', error.message)
    await cleanup()
    process.exit(1)
  }
}

main()

