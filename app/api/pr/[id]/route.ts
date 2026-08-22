import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse, PurchaseRequest } from '@/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 }
    )
  }

  const { id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('purchase_requests')
    .select(
      `*, submitted_by_employee:employees!submitted_by(id, name, email, role, department),
       submitted_to_employee:employees!submitted_to(id, name, email, role),
       approvals:pr_approvals(*, approver:employees(id, name, role))`
    )
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'NOT_FOUND', message: 'PR not found' } },
      { status: 404 }
    )
  }

  // Staff can only see their own PRs
  if (
    session.role === 'staff' &&
    data.submitted_by !== session.id &&
    data.submitted_to !== session.id
  ) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
      { status: 403 }
    )
  }

  return NextResponse.json<ApiResponse<PurchaseRequest>>({
    success: true,
    data: data as unknown as PurchaseRequest,
  })
}
