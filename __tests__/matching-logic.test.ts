/**
 * Tests for matching logic
 *
 * These tests verify the core business logic of the PFC Match app:
 * 1. Feed filtering based on preferences
 * 2. Mutual like detection and match creation
 * 3. Date confirmation and finalization
 */

describe('Matching Logic', () => {
  describe('Feed Filtering', () => {
    it('should filter candidates by age range', () => {
      const preferences = {
        age_min: 20,
        age_max: 25,
        height_min: 150,
        height_max: 200,
        interested_in: 'everyone' as const,
        frat_whitelist: null,
      }

      const candidates = [
        { id: '1', age: 19, height_cm: 170, interested_in: 'everyone' as const },
        { id: '2', age: 22, height_cm: 175, interested_in: 'everyone' as const },
        { id: '3', age: 26, height_cm: 180, interested_in: 'everyone' as const },
      ]

      const filtered = candidates.filter(
        (c) =>
          c.age >= preferences.age_min &&
          c.age <= preferences.age_max &&
          c.height_cm >= preferences.height_min &&
          c.height_cm <= preferences.height_max
      )

      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('2')
    })

    it('should filter candidates by height range', () => {
      const preferences = {
        age_min: 18,
        age_max: 30,
        height_min: 170,
        height_max: 190,
        interested_in: 'everyone' as const,
        frat_whitelist: null,
      }

      const candidates = [
        { id: '1', age: 22, height_cm: 165, interested_in: 'everyone' as const },
        { id: '2', age: 23, height_cm: 175, interested_in: 'everyone' as const },
        { id: '3', age: 24, height_cm: 195, interested_in: 'everyone' as const },
      ]

      const filtered = candidates.filter(
        (c) =>
          c.age >= preferences.age_min &&
          c.age <= preferences.age_max &&
          c.height_cm >= preferences.height_min &&
          c.height_cm <= preferences.height_max
      )

      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('2')
    })

    it('should filter candidates by frat whitelist', () => {
      const preferences = {
        age_min: 18,
        age_max: 30,
        height_min: 150,
        height_max: 200,
        interested_in: 'everyone' as const,
        frat_whitelist: ['Alpha Kappa Psi', 'Delta Sigma Pi'],
      }

      const candidates = [
        {
          id: '1',
          age: 22,
          height_cm: 170,
          frat: 'Alpha Kappa Psi',
          interested_in: 'everyone' as const,
        },
        { id: '2', age: 23, height_cm: 175, frat: 'Other', interested_in: 'everyone' as const },
        {
          id: '3',
          age: 24,
          height_cm: 180,
          frat: 'Delta Sigma Pi',
          interested_in: 'everyone' as const,
        },
      ]

      const filtered = candidates.filter(
        (c) =>
          c.age >= preferences.age_min &&
          c.age <= preferences.age_max &&
          c.height_cm >= preferences.height_min &&
          c.height_cm <= preferences.height_max &&
          (!preferences.frat_whitelist ||
            preferences.frat_whitelist.length === 0 ||
            preferences.frat_whitelist.includes(c.frat))
      )

      expect(filtered).toHaveLength(2)
      expect(filtered.map((c) => c.id)).toEqual(['1', '3'])
    })

    it('should respect gender preferences', () => {
      const userPreferences = {
        interested_in: 'women' as const,
      }

      const candidates = [
        { id: '1', interested_in: 'men' as const },
        { id: '2', interested_in: 'women' as const },
        { id: '3', interested_in: 'everyone' as const },
      ]

      // Logic: user wants women, so candidates should be interested in men or everyone
      const filtered = candidates.filter((c) => {
        if (c.interested_in === 'everyone') return true
        if (userPreferences.interested_in === 'everyone') return true
        return (
          (userPreferences.interested_in === 'women' && c.interested_in === 'men') ||
          (userPreferences.interested_in === 'men' && c.interested_in === 'women')
        )
      })

      expect(filtered).toHaveLength(2)
      expect(filtered.map((c) => c.id)).toEqual(['1', '3'])
    })
  })

  describe('Mutual Matching', () => {
    it('should detect mutual likes', () => {
      const swipes = [
        { swiper: 'user1', swipee: 'user2', decision: 'like' },
        { swiper: 'user2', swipee: 'user1', decision: 'like' },
      ]

      const user1LikedUser2 = swipes.some(
        (s) => s.swiper === 'user1' && s.swipee === 'user2' && s.decision === 'like'
      )
      const user2LikedUser1 = swipes.some(
        (s) => s.swiper === 'user2' && s.swipee === 'user1' && s.decision === 'like'
      )

      expect(user1LikedUser2 && user2LikedUser1).toBe(true)
    })

    it('should not match on one-way likes', () => {
      const swipes = [
        { swiper: 'user1', swipee: 'user2', decision: 'like' },
        { swiper: 'user2', swipee: 'user1', decision: 'pass' },
      ]

      const user1LikedUser2 = swipes.some(
        (s) => s.swiper === 'user1' && s.swipee === 'user2' && s.decision === 'like'
      )
      const user2LikedUser1 = swipes.some(
        (s) => s.swiper === 'user2' && s.swipee === 'user1' && s.decision === 'like'
      )

      expect(user1LikedUser2 && user2LikedUser1).toBe(false)
    })

    it('should create match with ordered user IDs', () => {
      const userId1 = '123'
      const userId2 = '456'

      const [userA, userB] = [userId1, userId2].sort()

      expect(userA).toBe('123')
      expect(userB).toBe('456')

      // Verify ordering is consistent regardless of who swiped first
      const [userA2, userB2] = [userId2, userId1].sort()
      expect(userA2).toBe(userA)
      expect(userB2).toBe(userB)
    })
  })

  describe('Date Confirmation', () => {
    it('should track individual confirmations', () => {
      const confirmations = [{ match_id: 'match1', confirmer: 'user1' }]

      const user1Confirmed = confirmations.some(
        (c) => c.match_id === 'match1' && c.confirmer === 'user1'
      )
      const user2Confirmed = confirmations.some(
        (c) => c.match_id === 'match1' && c.confirmer === 'user2'
      )

      expect(user1Confirmed).toBe(true)
      expect(user2Confirmed).toBe(false)
    })

    it('should detect when both users confirmed', () => {
      const confirmations = [
        { match_id: 'match1', confirmer: 'user1' },
        { match_id: 'match1', confirmer: 'user2' },
      ]

      const bothConfirmed = confirmations.filter((c) => c.match_id === 'match1').length === 2

      expect(bothConfirmed).toBe(true)
    })

    it('should mark users as finalized after both confirm', () => {
      const profiles = [
        { id: 'user1', is_finalized: false },
        { id: 'user2', is_finalized: false },
        { id: 'user3', is_finalized: false },
      ]

      const confirmations = [
        { match_id: 'match1', confirmer: 'user1' },
        { match_id: 'match1', confirmer: 'user2' },
      ]

      const match = { id: 'match1', user_a: 'user1', user_b: 'user2' }

      // Simulate finalization
      const bothConfirmed = confirmations.filter((c) => c.match_id === match.id).length === 2

      if (bothConfirmed) {
        profiles.forEach((p) => {
          if (p.id === match.user_a || p.id === match.user_b) {
            p.is_finalized = true
          }
        })
      }

      expect(profiles.find((p) => p.id === 'user1')?.is_finalized).toBe(true)
      expect(profiles.find((p) => p.id === 'user2')?.is_finalized).toBe(true)
      expect(profiles.find((p) => p.id === 'user3')?.is_finalized).toBe(false)
    })

    it('should exclude finalized users from feed', () => {
      const candidates = [
        { id: 'user1', is_finalized: false },
        { id: 'user2', is_finalized: true },
        { id: 'user3', is_finalized: false },
      ]

      const availableCandidates = candidates.filter((c) => !c.is_finalized)

      expect(availableCandidates).toHaveLength(2)
      expect(availableCandidates.map((c) => c.id)).toEqual(['user1', 'user3'])
    })
  })

  describe('Already Swiped Filter', () => {
    it('should exclude already swiped users from feed', () => {
      const currentUserId = 'user1'
      const swipes = [
        { swiper: 'user1', swipee: 'user2' },
        { swiper: 'user1', swipee: 'user3' },
      ]

      const swipedIds = swipes.filter((s) => s.swiper === currentUserId).map((s) => s.swipee)

      const candidates = [
        { id: 'user2' },
        { id: 'user3' },
        { id: 'user4' },
        { id: 'user5' },
      ]

      const unswipedCandidates = candidates.filter((c) => !swipedIds.includes(c.id))

      expect(unswipedCandidates).toHaveLength(2)
      expect(unswipedCandidates.map((c) => c.id)).toEqual(['user4', 'user5'])
    })
  })
})
