import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function testAuth() {
  console.log('\n🔍 Testing authentication and permissions...\n')

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Try to get all profiles (should work - RLS allows viewing non-finalized profiles)
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, email')
    .limit(5)

  console.log('📋 Can read profiles:', !profilesError)
  if (profilesError) {
    console.error('   Error:', profilesError.message)
  } else {
    console.log(`   Found ${profiles?.length || 0} profiles`)
  }

  // Try to create a swipe without auth (should fail)
  console.log('\n🚫 Testing swipe without auth (should fail)...')
  const { error: swipeError } = await supabase
    .from('swipes')
    .insert({
      swiper: profiles?.[0]?.id,
      swipee: profiles?.[1]?.id,
      decision: 'like'
    })

  console.log('   Failed as expected:', !!swipeError)
  if (swipeError) {
    console.log('   Error:', swipeError.message)
  }

  console.log('\n💡 Diagnosis:')
  console.log('   - To create swipes, you must be authenticated in the browser')
  console.log('   - The swipe action uses server-side auth from cookies')
  console.log('   - Check browser console for "Not authenticated" errors')
  console.log('   - Make sure you\'re logged in before swiping')
}

testAuth()
