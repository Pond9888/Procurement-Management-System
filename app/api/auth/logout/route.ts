import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST() {
  const res = NextResponse.redirect(`${APP_URL}/login`)
  res.headers.append('Set-Cookie', clearSessionCookie())
  return res
}

// Support GET for simple link-based logout
export const GET = POST
