import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse, Employee, EmployeeRole } from '@/types'

/** PATCH /api/master/employees/[id] — update employee fields (admin only) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params
  const body: Partial<{
    name: string
    email: string
    role: EmployeeRole
    department: string
    team: string
    is_active: boolean
    zoho_user_id: string
  }> = await req.json()

  const ALLOWED_FIELDS = ['name', 'email', 'role', 'department', 'team', 'is_active', 'zoho_user_id']
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

  for (const key of ALLOWED_FIELDS) {
    if (key in body) updateData[key] = (body as Record<string, unknown>)[key]
  }

  if (Object.keys(updateData).length === 1) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'VALIDATION', message: 'ไม่มีข้อมูลที่ต้องการอัปเดต' } },
      { status: 400 }
    )
  }

  const VALID_ROLES: EmployeeRole[] = ['staff', 'team_lead', 'manager', 'excom', 'finance', 'admin']
  if (updateData.role && !VALID_ROLES.includes(updateData.role as EmployeeRole)) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'VALIDATION', message: 'role ไม่ถูกต้อง' } },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('employees')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  await supabase.from('activity_logs').insert({
    table_name: 'employees',
    record_id: id,
    action: 'updated',
    actor_id: session.id,
    new_data: updateData,
  })

  return NextResponse.json<ApiResponse<Employee>>({ success: true, data })
}
