import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

interface PaymentUpdateBody {
  uv_number?: string
  pv_number?: string
  estimated_date?: string
  planned_date?: string
  finance_send_date?: string
  paid_date?: string
  year_finance?: number
  month_finance?: number
  week_number?: string
  status?: 'pending' | 'invoiced' | 'paid'
}

// PATCH /api/payments/[id] — Finance updates UV/PV/dates/status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !['finance', 'admin'].includes(session.role)) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'FORBIDDEN', message: 'Finance access only' } },
      { status: 403 }
    )
  }

  const { id } = await params
  const body: PaymentUpdateBody = await req.json()
  const supabase = createServiceClient()

  const updates: Record<string, unknown> = {}
  const allowed: (keyof PaymentUpdateBody)[] = [
    'uv_number', 'pv_number', 'estimated_date', 'planned_date',
    'finance_send_date', 'paid_date', 'year_finance', 'month_finance',
    'week_number', 'status',
  ]

  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'VALIDATION', message: 'ไม่มีข้อมูลที่ต้องการอัปเดต' } },
      { status: 400 }
    )
  }

  const { data: payment, error } = await supabase
    .from('payments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  // If marking as paid, update GRD aging_status → done
  if (updates.status === 'paid' && payment?.grd_id) {
    await supabase
      .from('goods_receipts')
      .update({ aging_status: 'done', updated_at: new Date().toISOString() })
      .eq('id', payment.grd_id)
  }

  await supabase.from('activity_logs').insert({
    table_name: 'payments',
    record_id: id,
    action: 'updated',
    actor_id: session.id,
    new_data: updates,
  })

  return NextResponse.json<ApiResponse<unknown>>({ success: true, data: payment })
}
