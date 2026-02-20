export const UCLA_FRATS_SORORITIES = [
  'AED',
  'AKP',
  'DEM',
  'DKA',
  'DSP',
  'PAD',
  'PHI CHI',
  'PSE/PCT',
  'SEP',
  'TT',
  'REI',
  'KAPI',
] as const

export const MIN_AGE = 18
export const MAX_AGE = 100
export const MIN_HEIGHT_CM = 100
export const MAX_HEIGHT_CM = 250

export const GENDER_OPTIONS = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'everyone', label: 'Everyone' }
] as const

export const MAX_PHOTOS = 3
export const MAX_PHOTO_SIZE_MB = 5
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

// Feature flags
export const WOMEN_LIKE_FIRST = process.env.NEXT_PUBLIC_WOMEN_LIKE_FIRST === 'true'
