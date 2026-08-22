import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import type { ApiResponse, UserSession } from '@/types'

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 }
    )
  }

  // Return session without tokens
  const { zoho_access_token: _, zoho_refresh_token: __, ...safeSession } = session

  return NextResponse.json<ApiResponse<Omit<UserSession, 'zoho_access_token' | 'zoho_refresh_token'>>>(
    { success: true, data: safeSession }
  )
}
