# PFC Match 💕

A production-ready dating app for UCLA professional fraternities and sororities to find dates for PFC Formal. Built with Next.js 14, Supabase, and TypeScript.

## Features

✨ **Complete Dating Flow**
- User authentication with magic links
- Profile creation with 3 photo uploads
- Preference filtering (age, height, frat/sorority, gender)
- Tinder-style swipe interface
- Instant matching on mutual likes
- Real-time chat with WebSocket support
- Date confirmation system (both users must confirm)
- Auto-removal from pool after confirmation

🔒 **Security & Data Privacy**
- Row Level Security (RLS) on all Supabase tables
- Users can only access their own data
- Secure photo storage with Supabase Storage
- Email-based authentication

🎨 **Modern UI**
- Mobile-first responsive design
- Tailwind CSS styling
- Smooth animations and transitions
- Real-time updates

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Styling**: Tailwind CSS
- **Testing**: Jest + React Testing Library

## Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account (free tier works)
- Git

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Hinge
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings → API to get your credentials
3. Run the SQL migration:
   - Go to SQL Editor in your Supabase dashboard
   - Copy the contents of `supabase/migrations/001_initial_schema.sql`
   - Paste and execute it

4. Set up Storage Bucket:
   - Go to Storage in Supabase dashboard
   - Create a new bucket named `profile-photos`
   - Set it to **Public**
   - Go to Storage Policies and add the policies commented at the bottom of the migration file

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Feature flags
NEXT_PUBLIC_WOMEN_LIKE_FIRST=false
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

### Tables

**profiles**
- User profile information (name, age, frat, height, photos, etc.)
- `is_finalized` flag to track users who have confirmed dates

**preferences**
- User preferences for matching (age range, height range, gender, frat whitelist)

**swipes**
- Records of user swipes (like/pass)
- Indexed for fast mutual match detection

**matches**
- Created when two users like each other
- Triggers automatic chat creation

**chats**
- One chat per match
- Auto-created via database trigger

**messages**
- Chat messages with real-time updates
- Character limit: 2000

**date_confirmations**
- Tracks which users confirmed their PFC date
- Triggers finalization when both users confirm

### Row Level Security (RLS)

All tables have RLS enabled with policies that:
- Allow users to view non-finalized profiles
- Restrict users to only their own data for sensitive operations
- Ensure users can only access chats for their matches
- Prevent unauthorized swipes or confirmations

## Project Structure

```
├── app/
│   ├── actions/          # Server actions for mutations
│   │   ├── swipes.ts
│   │   └── chat.ts
│   ├── auth/            # Authentication pages
│   │   ├── login/
│   │   └── callback/
│   ├── onboarding/      # Profile creation
│   ├── preferences/     # Preference settings
│   ├── swipe/          # Main swipe interface
│   ├── matches/        # List of matches
│   ├── chat/[chatId]/  # Individual chat
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── lib/
│   ├── supabase/       # Supabase client setup
│   │   ├── client.ts   # Browser client
│   │   ├── server.ts   # Server client
│   │   └── database.types.ts
│   ├── constants.ts    # App constants
│   └── utils.ts        # Utility functions
├── supabase/
│   └── migrations/     # Database migrations
├── __tests__/          # Unit tests
├── middleware.ts       # Auth middleware
└── README.md
```

## Key Features Explained

### Onboarding Flow

1. User signs in with magic link (email)
2. Creates profile with 3 photos (validated: max 5MB, JPG/PNG/WebP)
3. Sets preferences (age, height, gender, optional frat filter)
4. Redirected to swipe feed

### Matching Algorithm

The feed shows candidates who:
- Are not finalized (haven't confirmed a date)
- Match user's age, height, and gender preferences
- Haven't been swiped yet by the user
- Match optional frat whitelist

When two users like each other:
- A match is created
- A chat is automatically generated
- Both users are notified

### Date Confirmation

1. Either user can press "Confirm PFC Date" in chat
2. When **both** users confirm:
   - Both profiles are marked as `is_finalized = true`
   - They're removed from the swipe pool
   - They can't match with anyone else
   - Chat is locked

## Testing

### Unit Tests

Run unit tests:

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

Unit tests cover:
- Utility functions (height conversion, image validation, etc.)
- Matching logic (feed filtering, mutual likes, confirmations)
- Finalization flow

### Integration Tests

Test all app mechanics end-to-end:

```bash
npm run test:mechanics
```

This comprehensive test script:
- Creates test users with profiles and preferences
- Tests feed filtering (age, height, gender, frat whitelist)
- Tests swiping (like/pass)
- Tests mutual matching and chat creation
- Tests messaging between matched users
- Tests date confirmation and finalization
- Verifies finalized users are excluded from feed

**Note**: Requires `SUPABASE_SERVICE_ROLE_KEY` in your environment for full database access. The script automatically cleans up test data after running.

## Feature Flags

### Women Like First

Set `NEXT_PUBLIC_WOMEN_LIKE_FIRST=true` to enable a rule where only women can send the first like. Men can only like back if a woman liked them first.

This is currently implemented as a constant but can be expanded to full logic in `app/actions/swipes.ts`.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Production Checklist

- [ ] Set up custom domain
- [ ] Configure Supabase production settings
- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Configure rate limiting
- [ ] Set up analytics
- [ ] Test email deliverability
- [ ] Set up backup strategy for database

## Common Issues & Solutions

### Images not loading
- Check Supabase Storage bucket is public
- Verify RLS policies are set up correctly
- Ensure image URLs are correct in database

### Authentication issues
- Verify email settings in Supabase Auth
- Check redirect URLs are configured
- Confirm environment variables are set

### Realtime not working
- Check Realtime is enabled in Supabase project settings
- Verify WebSocket connections aren't blocked
- Test with Supabase logs

## Future Enhancements

- [ ] Push notifications for new matches/messages
- [ ] Photo verification
- [ ] Report/block functionality
- [ ] Admin dashboard
- [ ] Analytics and insights
- [ ] Event countdown timer
- [ ] Post-event feedback
- [ ] Video profiles
- [ ] Ice breaker questions
- [ ] Group matching for friend groups

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - feel free to use this for your own events!

## Support

For issues and questions:
- Create an issue on GitHub
- Check existing issues for solutions
- Review Supabase docs for database questions

## Credits

Built for UCLA Professional Fraternities & Sororities Council (PFC) Formal.

---

**Happy Matching! 💕**
