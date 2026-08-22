import { NextResponse } from 'next/server'
import { buildZohoAuthUrl } from '@/lib/auth'
import { randomBytes } from 'crypto'

export async function GET() {
  const state = randomBytes(16).toString('hex')

  const url = buildZohoAuthUrl(state)

  const res = NextResponse.redirect(url)
  // Store state in short-lived cookie to verify on callback
  res.cookies.set('zoho_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 5, // 5 minutes
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })

  return res
}
