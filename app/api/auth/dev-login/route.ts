import { NextRequest, NextResponse } from 'next/server'
import { buildSessionCookie } from '@/lib/auth'
import type { UserSession } from '@/types'

/**
 * GET /api/auth/dev-login?role=admin
 * DEV ONLY — bypass Zoho SSO, inject a mock session cookie.
 * Disabled in production (NODE_ENV !== 'development').
 *
 * Query params:
 *   role = staff | team_lead | manager | excom | finance | admin  (default: admin)
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development' || process.env.DEV_MOCK_LOGIN !== 'true') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const role = (req.nextUrl.searchParams.get('role') ?? 'admin') as UserSession['role']

  const MOCK_USERS: Record<string, Partial<UserSession>> = {
    staff:     { name: 'สุดา รุ่งเรือง',  employee_code: 'EMP-004', department: 'Operations' },
    team_lead: { name: 'กิตติ พลาย',      employee_code: 'EMP-003', department: 'Engineering' },
    manager:   { name: 'สมชาย ใจดี',      employee_code: 'EMP-001', department: 'Operations' },
    excom:     { name: 'ปรีชา วงศ์ดี',    employee_code: 'EMP-010', department: 'Executive' },
    finance:   { name: 'มณีรัตน์ งาม',   employee_code: 'EMP-002', department: 'Finance' },
    admin:     { name: 'ผู้ดูแลระบบ',     employee_code: 'ADMIN-001', department: 'IT' },
  }

  const user = MOCK_USERS[role] ?? MOCK_USERS.admin

  const session: UserSession = {
    id: `mock-${role}-00000000-0000-0000-0000-000000000001`,
    employee_code: user.employee_code!,
    name: user.name!,
    email: `${role}@example.com`,
    role,
    department: user.department ?? null,
    company_id: null,
    zoho_access_token: 'mock_access_token',
    zoho_refresh_token: 'mock_refresh_token',
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 8, // 8h
  }

  const res = NextResponse.redirect(new URL('/dashboard', req.url))
  res.headers.set('Set-Cookie', buildSessionCookie(session))
  return res
}
