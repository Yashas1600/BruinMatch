import { createClient } from '@supabase/supabase-js'

// Test users for "spongebob" dating pool
const testUsers = [
  {
    email: 'spongebob@bikinibottom.com',
    name: 'SpongeBob',
    age: 22,
    gender: 'men' as const,
    frat: 'Alpha Epsilon Pi',
    height_cm: 170,
    interested_in: 'women' as const,
    one_liner: 'I\'m ready! I\'m ready! Looking for someone to flip patties with! 🍔',
  },
  {
    email: 'mrkrabs@bikinibottom.com',
    name: 'Mr. Krabs',
    age: 25,
    gender: 'men' as const,
    frat: 'Delta Sigma Phi',
    height_cm: 175,
    interested_in: 'women' as const,
    one_liner: 'Money money money! But I\'ll spend it all on the right person 💰',
  },
  {
    email: 'sandy@bikinibottom.com',
    name: 'Sandy',
    age: 21,
    gender: 'women' as const,
    frat: 'Kappa Alpha Theta',
    height_cm: 165,
    interested_in: 'men' as const,
    one_liner: 'Texas girl in California! Love science, karate, and adventure 🤠',
  },
  {
    email: 'patrick@bikinibottom.com',
    name: 'Patrick',
    age: 23,
    gender: 'men' as const,
    frat: 'Phi Kappa Psi',
    height_cm: 180,
    interested_in: 'women' as const,
    one_liner: 'Is mayonnaise an instrument? Let\'s find out together! ⭐',
  },
  {
    email: 'gary@bikinibottom.com',
    name: 'Gary',
    age: 20,
    gender: 'men' as const,
    frat: 'Sigma Nu',
    height_cm: 168,
    interested_in: 'everyone' as const,
    one_liner: 'Meow! Looking for someone who appreciates the simple things 🐌',
  },
  {
    email: 'plankton@bikinibottom.com',
    name: 'Plankton',
    age: 24,
    gender: 'men' as const,
    frat: 'Zeta Beta Tau',
    height_cm: 160,
    interested_in: 'women' as const,
    one_liner: 'Evil genius seeking partner in crime. Secret formula not required 🧪',
  },
]

async function fixTestUsers() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  console.log('Creating profiles for existing auth users...\n')

  for (const user of testUsers) {
    try {
      // Get auth user by email
      const { data: userData } = await supabase.auth.admin.listUsers()
      const authUser = userData.users.find(u => u.email === user.email)

      if (!authUser) {
        console.error(`❌ Auth user not found for ${user.name}`)
        continue
      }

      const userId = authUser.id

      // Create profile with dating_pool
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        email: user.email,
        name: user.name,
        age: user.age,
        gender: user.gender,
        frat: user.frat,
        height_cm: user.height_cm,
        interested_in: user.interested_in,
        one_liner: user.one_liner,
        dating_pool: 'spongebob',
        photos: [
          'https://via.placeholder.com/400x400.png?text=' + encodeURIComponent(user.name),
          'https://via.placeholder.com/400x400.png?text=' + encodeURIComponent(user.name + '+2'),
          'https://via.placeholder.com/400x400.png?text=' + encodeURIComponent(user.name + '+3'),
        ],
        is_finalized: false,
      })

      if (profileError) {
        if (profileError.code === '23505') {
          console.log(`⚠️  Profile already exists for ${user.name}`)
        } else {
          console.error(`❌ Failed to create profile for ${user.name}:`, profileError.message)
        }
        continue
      }

      // Create preferences
      const { error: prefsError } = await supabase.from('preferences').insert({
        user_id: userId,
        frat_whitelist: null,
        age_min: 18,
        age_max: 30,
        height_min: 150,
        height_max: 200,
        interested_in: user.interested_in,
      })

      if (prefsError) {
        if (prefsError.code === '23505') {
          console.log(`⚠️  Preferences already exist for ${user.name}`)
        } else {
          console.error(`❌ Failed to create preferences for ${user.name}:`, prefsError.message)
        }
        continue
      }

      console.log(`✅ Created profile for ${user.name}`)
    } catch (error: any) {
      console.error(`❌ Error creating ${user.name}:`, error.message)
    }
  }

  console.log('\n✅ Done! Test users are ready.')
}

fixTestUsers()
