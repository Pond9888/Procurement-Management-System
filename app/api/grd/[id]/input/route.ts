import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

interface InputBody {
  date_of_completion: string    // YYYY-MM-DD
  remark?: string
  receiver_id?: string          // assign staff if not set
  team_lead_id?: string
  manager_id?: string
}

/**
 * PATCH /api/grd/[id]/input
 * Staff fills: date_of_completion, remark, assigns approvers.
 * Status must be 'pending_input'.
 * After save, status remains 'pending_input' until Staff signs.
 */
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

  const { id } = await params
  const body: InputBody = await req.json()

  if (!body.date_of_completion) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'VALIDATION', message: 'กรุณาระบุวันที่รับงาน' } },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  // Fetch GRD — validate ownership + state
  const { data: grd, error: fetchErr } = await supabase
    .from('goods_receipts')
    .select('id, status, receiver_id')
    .eq('id', id)
    .single()

  if (fetchErr || !grd) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'NOT_FOUND', message: 'GRD not found' } },
      { status: 404 }
    )
  }

  if (!['pending_input', 'draft'].includes(grd.status)) {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: 'INVALID_STATE', message: `ไม่สามารถแก้ไข GRD ที่มีสถานะ "${grd.status}"` },
      },
      { status: 422 }
    )
  }

  // Only the assigned receiver (or admin) can edit
  if (session.role === 'staff' && grd.receiver_id && grd.receiver_id !== session.id) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์แก้ไข GRD นี้' } },
      { status: 403 }
    )
  }

  const updates: Record<string, unknown> = {
    date_of_completion: body.date_of_completion,
    remark: body.remark ?? null,
    updated_at: new Date().toISOString(),
  }

  // Auto-assign receiver to current user if not set
  if (!grd.receiver_id) updates.receiver_id = session.id
  if (body.team_lead_id) updates.team_lead_id = body.team_lead_id
  if (body.manager_id) updates.manager_id = body.manager_id

  const { error: updateErr } = await supabase
    .from('goods_receipts')
    .update(updates)
    .eq('id', id)

  if (updateErr) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'DB_ERROR', message: updateErr.message } },
      { status: 500 }
    )
  }

  await supabase.from('activity_logs').insert({
    table_name: 'goods_receipts',
    record_id: id,
    action: 'updated',
    actor_id: session.id,
    new_data: { date_of_completion: body.date_of_completion },
  })

  return NextResponse.json<ApiResponse<{ ok: boolean }>>({ success: true, data: { ok: true } })
}
