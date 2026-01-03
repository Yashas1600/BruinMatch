'use server'

import { cookies } from 'next/headers'

const ADMIN_USERNAME = 'Yashas'
const ADMIN_PASSWORD = 'admin'
const ADMIN_SESSION_COOKIE = 'admin_session'

export async function adminLogin(username: string, password: string) {
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const cookieStore = await cookies()
    // Set cookie that expires in 24 hours
    cookieStore.set(ADMIN_SESSION_COOKIE, 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })

    return { success: true }
  }

  return { success: false, error: 'Invalid username or password' }
}

export async function adminLogout() {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_SESSION_COOKIE)
  return { success: true }
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies()
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)
  return !!session?.value
}
