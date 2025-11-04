import { cmToFeetInches, feetInchesToCm, validateImageFile, formatRelativeTime } from '@/lib/utils'

describe('Utils', () => {
  describe('cmToFeetInches', () => {
    it('converts cm to feet and inches correctly', () => {
      expect(cmToFeetInches(180)).toBe("5'11\"")
      expect(cmToFeetInches(152)).toBe("5'0\"")
      expect(cmToFeetInches(198)).toBe("6'6\"")
    })
  })

  describe('feetInchesToCm', () => {
    it('converts feet and inches to cm correctly', () => {
      expect(feetInchesToCm(5, 11)).toBe(180)
      expect(feetInchesToCm(5, 0)).toBe(152)
      expect(feetInchesToCm(6, 6)).toBe(198)
    })
  })

  describe('validateImageFile', () => {
    it('accepts valid image files', () => {
      const validFile = new File([''], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(validFile, 'size', { value: 1024 * 1024 }) // 1MB
      const result = validateImageFile(validFile)
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('rejects files that are too large', () => {
      const largeFile = new File([''], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 }) // 6MB
      const result = validateImageFile(largeFile)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Image must be less than 5MB')
    })

    it('rejects invalid file types', () => {
      const invalidFile = new File([''], 'test.pdf', { type: 'application/pdf' })
      Object.defineProperty(invalidFile, 'size', { value: 1024 })
      const result = validateImageFile(invalidFile)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Only JPG, PNG, and WebP images are allowed')
    })
  })

  describe('formatRelativeTime', () => {
    it('formats recent times correctly', () => {
      const now = new Date()
      const justNow = new Date(now.getTime() - 30 * 1000).toISOString()
      expect(formatRelativeTime(justNow)).toBe('just now')

      const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
      expect(formatRelativeTime(fiveMinsAgo)).toBe('5m ago')

      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
      expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago')

      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
      expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago')
    })
  })
})
