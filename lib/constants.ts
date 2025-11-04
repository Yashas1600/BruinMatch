export const UCLA_FRATS_SORORITIES = [
  // Professional Fraternities
  'Alpha Kappa Psi',
  'Delta Sigma Pi',
  'Phi Chi Theta',

  // Professional Sororities
  'Kappa Alpha Theta',
  'Delta Gamma',
  'Gamma Phi Beta',

  // Business Fraternities
  'Beta Alpha Psi',
  'Financial Management Association',

  // Engineering
  'Theta Tau',
  'Alpha Omega Epsilon',

  // Medical/Health
  'Phi Delta Epsilon',
  'Alpha Epsilon Delta',

  // Other
  'Other'
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
