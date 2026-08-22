import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse, FinanceSummary } from '@/types'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 }
    )
  }

  if (!['finance', 'admin', 'manager'].includes(session.role)) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'FORBIDDEN', message: 'Finance access only' } },
      { status: 403 }
    )
  }

  const supabase = createServiceClient()

  const { data: grds } = await supabase
    .from('goods_receipts')
    .select('status, aging_status, total_amount')

  type Row = { status: string; aging_status: string; total_amount: number }
  const rows: Row[] = (grds ?? []) as Row[]

  const summary: FinanceSummary = {
    total_grd: rows.length,
    pending_input: rows.filter((r) => ['draft', 'pending_input'].includes(r.status)).length,
    pending_approval: rows.filter((r) =>
      ['signed', 'pending_tl', 'pending_manager'].includes(r.status)
    ).length,
    approved_unpaid: rows.filter(
      (r) => r.status === 'approved' && r.aging_status === 'pending'
    ).length,
    paid: rows.filter((r) => r.aging_status === 'done').length,
  }

  // Total amount approved but unpaid
  const pendingAmount = rows
    .filter((r) => r.status === 'approved' && r.aging_status === 'pending')
    .reduce((s, r) => s + (r.total_amount ?? 0), 0)

  return NextResponse.json<ApiResponse<FinanceSummary & { pending_amount: number }>>({
    success: true,
    data: { ...summary, pending_amount: pendingAmount },
  })
}
