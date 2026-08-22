import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse, Payment } from '@/types'

// GET /api/payments
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 }
    )
  }
  if (!['finance', 'admin'].includes(session.role)) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'FORBIDDEN', message: 'Finance access only' } },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const page = Number(searchParams.get('page') ?? '1')
  const limit = Number(searchParams.get('limit') ?? '50')
  const offset = (page - 1) * limit

  const supabase = createServiceClient()
  let query = supabase
    .from('payments')
    .select(
      `*, vendor:vendors(name),
       grd:goods_receipts(grd_number, status, total_amount),
       po:purchase_orders(po_number)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)

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

// POST /api/payments — create payment record for a GRD
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !['finance', 'admin'].includes(session.role)) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'FORBIDDEN', message: 'Finance access only' } },
      { status: 403 }
    )
  }

  const body = await req.json()

  if (!body.grd_id) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'VALIDATION', message: 'grd_id required' } },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  // Fetch GRD to get vendor + PO
  const { data: grd } = await supabase
    .from('goods_receipts')
    .select('id, po_id, vendor_id, total_amount, status')
    .eq('id', body.grd_id)
    .single()

  if (!grd) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'NOT_FOUND', message: 'GRD not found' } },
      { status: 404 }
    )
  }

  if (grd.status !== 'approved') {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'INVALID_STATE', message: 'GRD ต้องถูก approve ก่อนสร้าง Payment' } },
      { status: 422 }
    )
  }

  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      grd_id: grd.id,
      po_id: grd.po_id,
      vendor_id: grd.vendor_id,
      amount: body.amount ?? grd.total_amount,
      uv_number: body.uv_number ?? null,
      pv_number: body.pv_number ?? null,
      estimated_date: body.estimated_date ?? null,
      planned_date: body.planned_date ?? null,
      year_finance: body.year_finance ?? null,
      month_finance: body.month_finance ?? null,
      week_number: body.week_number ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  await supabase.from('activity_logs').insert({
    table_name: 'payments',
    record_id: payment.id,
    action: 'created',
    actor_id: session.id,
    new_data: { grd_id: grd.id },
  })

  return NextResponse.json<ApiResponse<Payment>>(
    { success: true, data: payment as Payment },
    { status: 201 }
  )
}
