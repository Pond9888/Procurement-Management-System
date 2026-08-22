import { NextRequest, NextResponse } from 'next/server'
import {
  exchangeZohoCode,
  getZohoUserInfo,
  buildSessionCookie,
} from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import type { UserSession } from '@/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Zoho returned an error (e.g. user denied)
  if (error) {
    return NextResponse.redirect(`${APP_URL}/login?error=zoho_denied`)
  }

  if (!code) {
    return NextResponse.redirect(`${APP_URL}/login?error=missing_code`)
  }

  // Verify CSRF state
  const storedState = req.cookies.get('zoho_oauth_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${APP_URL}/login?error=invalid_state`)
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokens = await exchangeZohoCode(code)

    // 2. Get Zoho user profile
    const zohoUser = await getZohoUserInfo(tokens.access_token)

    // 3. Look up employee by email in Supabase
    const supabase = createServiceClient()
    const { data: employee, error: dbError } = await supabase
      .from('employees')
      .select('id, employee_code, name, email, role, department, company_id, is_active')
      .eq('email', zohoUser.Email)
      .single()

    if (dbError || !employee) {
      return NextResponse.redirect(`${APP_URL}/login?error=not_found`)
    }

    if (!employee.is_active) {
      return NextResponse.redirect(`${APP_URL}/login?error=inactive`)
    }

    // 4. Update zoho_user_id if first login
    if (zohoUser.ZUID) {
      await supabase
        .from('employees')
        .update({ zoho_user_id: zohoUser.ZUID, updated_at: new Date().toISOString() })
        .eq('id', employee.id)
    }

    // 5. Build session
    const session: UserSession = {
      id: employee.id,
      employee_code: employee.employee_code,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      company_id: employee.company_id,
      zoho_access_token: tokens.access_token,
      zoho_refresh_token: tokens.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (tokens.expires_in ?? 3600),
    }

    // 6. Set session cookie and redirect to dashboard
    const res = NextResponse.redirect(`${APP_URL}/dashboard`)
    res.headers.append('Set-Cookie', buildSessionCookie(session))
    res.cookies.delete('zoho_oauth_state')
    return res
  } catch (err) {
    console.error('[auth/callback] error:', err)
    return NextResponse.redirect(`${APP_URL}/login?error=server_error`)
  }
}
