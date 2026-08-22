import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import type { UserSession } from '@/types'

const SESSION_COOKIE = 'vertex_session'
const COOKIE_MAX_AGE = 60 * 60 * 8  // 8 hours

// ---------------------------------------------------------------------------
// Session storage (HTTP-only cookie, JSON-encoded)
// ---------------------------------------------------------------------------

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(SESSION_COOKIE)?.value
  if (!raw) return null
  try {
    const session: UserSession = JSON.parse(raw)
    if (session.expires_at < Math.floor(Date.now() / 1000)) return null
    return session
  } catch {
    return null
  }
}

export function getSessionFromRequest(req: NextRequest): UserSession | null {
  const raw = req.cookies.get(SESSION_COOKIE)?.value
  if (!raw) return null
  try {
    const session: UserSession = JSON.parse(raw)
    if (session.expires_at < Math.floor(Date.now() / 1000)) return null
    return session
  } catch {
    return null
  }
}

export function buildSessionCookie(session: UserSession): string {
  const value = JSON.stringify(session)
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${COOKIE_MAX_AGE}`,
    process.env.NODE_ENV === 'production' ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
}

// ---------------------------------------------------------------------------
// Zoho OAuth helpers
// ---------------------------------------------------------------------------

const ZOHO_ACCOUNTS_URL = 'https://accounts.zoho.com'

export function buildZohoAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.ZOHO_CLIENT_ID!,
    scope: 'ZohoExpense.fullaccess.all,ZohoSign.documents.ALL,ZohoMail.send.CREATE',
    redirect_uri: process.env.ZOHO_REDIRECT_URI!,
    access_type: 'offline',
    state,
  })
  return `${ZOHO_ACCOUNTS_URL}/oauth/v2/auth?${params}`
}

export async function exchangeZohoCode(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const res = await fetch(`${ZOHO_ACCOUNTS_URL}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      redirect_uri: process.env.ZOHO_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Zoho token exchange failed: ${res.status}`)
  return res.json()
}

export async function refreshZohoToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const res = await fetch(`${ZOHO_ACCOUNTS_URL}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Zoho token refresh failed: ${res.status}`)
  return res.json()
}

/** Fetch the Zoho user profile from their accounts API */
export async function getZohoUserInfo(accessToken: string): Promise<{
  ZUID: string
  Email: string
  Display_Name: string
}> {
  const res = await fetch(`${ZOHO_ACCOUNTS_URL}/oauth/user/info`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Zoho user info failed: ${res.status}`)
  return res.json()
}
