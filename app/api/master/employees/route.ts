import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse, Employee, EmployeeRole } from '@/types'

/** GET /api/master/employees — list all employees (admin only) */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 }
    )
  }
  if (session.role !== 'admin') {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'FORBIDDEN', message: 'Admin only' } },
      { status: 403 }
    )
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('name')

  if (error) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json<ApiResponse<Employee[]>>({ success: true, data: data ?? [] })
}

interface CreateBody {
  employee_code: string
  name: string
  email: string
  role: EmployeeRole
  department?: string
  team?: string
  company_id?: string
  zoho_user_id?: string
}

/** POST /api/master/employees — create employee (admin only) */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 }
    )
  }
  if (session.role !== 'admin') {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'FORBIDDEN', message: 'Admin only' } },
      { status: 403 }
    )
  }

  const body: CreateBody = await req.json()

  if (!body.employee_code || !body.name || !body.email || !body.role) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'VALIDATION', message: 'กรุณากรอก employee_code, name, email, role' } },
      { status: 400 }
    )
  }

  const VALID_ROLES: EmployeeRole[] = ['staff', 'team_lead', 'manager', 'excom', 'finance', 'admin']
  if (!VALID_ROLES.includes(body.role)) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'VALIDATION', message: `role ไม่ถูกต้อง` } },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('employees')
    .insert({
      employee_code: body.employee_code,
      name: body.name,
      email: body.email,
      role: body.role,
      department: body.department ?? null,
      team: body.team ?? null,
      company_id: body.company_id ?? null,
      zoho_user_id: body.zoho_user_id ?? null,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    const msg = error.message.includes('duplicate') ? 'Employee code หรือ email ซ้ำกัน' : error.message
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'DB_ERROR', message: msg } },
      { status: 500 }
    )
  }

  await supabase.from('activity_logs').insert({
    table_name: 'employees',
    record_id: data.id,
    action: 'created',
    actor_id: session.id,
    new_data: { name: data.name, role: data.role },
  })

  return NextResponse.json<ApiResponse<Employee>>({ success: true, data }, { status: 201 })
}
