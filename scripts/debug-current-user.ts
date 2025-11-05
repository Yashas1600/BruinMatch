import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugAllMatches() {
  console.log('\n🔍 Checking all users and matches...\n')

  // Get all profiles
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, email')

  if (profileError) {
    console.error('Error:', profileError)
    return
  }

  console.log(`Found ${profiles?.length || 0} users:`)
  profiles?.forEach(p => console.log(`  - ${p.name} (${p.email})`))

  // Get all matches
  const { data: matches, error: matchError } = await supabase
    .from('matches')
    .select('*, user_a:profiles!matches_user_a_fkey(name), user_b:profiles!matches_user_b_fkey(name)')

  console.log(`\nFound ${matches?.length || 0} matches:`)
  matches?.forEach((m: any) => {
    console.log(`  - ${m.user_a?.name || m.user_a} ↔ ${m.user_b?.name || m.user_b}`)
  })

  // Get all swipes
  const { data: swipes, error: swipeError } = await supabase
    .from('swipes')
    .select('*, swiper:profiles!swipes_swiper_fkey(name), swipee:profiles!swipes_swipee_fkey(name)')

  console.log(`\nFound ${swipes?.length || 0} swipes:`)
  const likeSwipes = swipes?.filter((s: any) => s.decision === 'like') || []
  console.log(`  - ${likeSwipes.length} likes`)
  likeSwipes.forEach((s: any) => {
    console.log(`    ${s.swiper?.name || s.swiper} → ${s.swipee?.name || s.swipee}`)
  })

  // Check for mutual likes without matches
  console.log('\n🔍 Checking for mutual likes without matches...')
  const likes = swipes?.filter((s: any) => s.decision === 'like') || []

  for (const like of likes) {
    const reciprocal = likes.find((s: any) =>
      s.swiper === like.swipee && s.swipee === like.swiper
    )

    if (reciprocal) {
      const [userA, userB] = [like.swiper, like.swipee].sort()
      const matchExists = matches?.find((m: any) =>
        m.user_a === userA && m.user_b === userB
      )

      if (!matchExists) {
        const swiperName = (like as any).swiper?.name || like.swiper
        const swipeeName = (like as any).swipee?.name || like.swipee
        console.log(`  ⚠️  Mutual like found without match: ${swiperName} ↔ ${swipeeName}`)
      }
    }
  }

  // Get all chats
  const { data: chats } = await supabase
    .from('chats')
    .select('*')

  console.log(`\nFound ${chats?.length || 0} chats`)
}

debugAllMatches()
