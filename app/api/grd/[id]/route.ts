import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse, GoodsReceipt } from '@/types'

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
    .from('goods_receipts')
    .select(
      `*, vendor:vendors(*), customer:customers(*),
       purchase_order:purchase_orders(*, vendor:vendors(*)),
       purchase_request:purchase_requests(*),
       receiver:employees!receiver_id(id, name, email, role, department),
       team_lead:employees!team_lead_id(id, name, email, role),
       manager:employees!manager_id(id, name, email, role),
       approvals:grd_approvals(*, approver:employees(id, name, role))`
    )
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'NOT_FOUND', message: 'GRD not found' } },
      { status: 404 }
    )
  }

  // Staff: only own GRDs
  if (session.role === 'staff' && data.receiver_id !== session.id) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
      { status: 403 }
    )
  }

  return NextResponse.json<ApiResponse<GoodsReceipt>>({
    success: true,
    data: data as unknown as GoodsReceipt,
  })
}
