import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse, GoodsReceipt } from '@/types'

// GET /api/grd — list GRDs (filtered by role)
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const aging = searchParams.get('aging')
  const page = Number(searchParams.get('page') ?? '1')
  const limit = Number(searchParams.get('limit') ?? '50')
  const offset = (page - 1) * limit

  const supabase = createServiceClient()
  let query = supabase
    .from('goods_receipts')
    .select(
      `id, grd_number, status, aging_status, total_amount, date_of_completion,
       created_at, signed_pdf_url,
       vendor:vendors(name),
       purchase_order:purchase_orders(po_number),
       purchase_request:purchase_requests(pr_number),
       receiver:employees!receiver_id(name),
       payment:payments(uv_number, pv_number, paid_date)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Role-based scope
  if (session.role === 'staff') {
    query = query.eq('receiver_id', session.id)
  } else if (session.role === 'team_lead') {
    query = query.eq('team_lead_id', session.id)
  }

  if (status) query = query.eq('status', status)
  if (aging) query = query.eq('aging_status', aging)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json<ApiResponse<{ items: unknown[]; total: number }>>({
    success: true,
    data: { items: data ?? [], total: count ?? 0 },
  })
}
