import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { notifyPending } from '@/lib/zoho/notify'
import type { ApiResponse } from '@/types'

/**
 * POST /api/grd/[id]/sign
 * Staff signs GRD → status: pending_input → pending_tl
 * Validates: date_of_completion must be filled before signing.
 */
export async function POST(
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

  const { data: grd, error: fetchErr } = await supabase
    .from('goods_receipts')
    .select('id, status, receiver_id, date_of_completion, team_lead_id')
    .eq('id', id)
    .single()

  if (fetchErr || !grd) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'NOT_FOUND', message: 'GRD not found' } },
      { status: 404 }
    )
  }

  if (grd.receiver_id !== session.id && session.role !== 'admin') {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้รับผิดชอบงานเท่านั้นที่เซ็นได้' } },
      { status: 403 }
    )
  }

  if (grd.status !== 'pending_input') {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: 'INVALID_STATE', message: `ไม่สามารถเซ็น GRD ที่มีสถานะ "${grd.status}"` },
      },
      { status: 422 }
    )
  }

  if (!grd.date_of_completion) {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: 'VALIDATION', message: 'กรุณากรอกวันที่รับงานก่อนเซ็น' },
      },
      { status: 400 }
    )
  }

  if (!grd.team_lead_id) {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: 'VALIDATION', message: 'กรุณาระบุ Team Lead ก่อนเซ็น' },
      },
      { status: 400 }
    )
  }

  const { error: updateErr } = await supabase
    .from('goods_receipts')
    .update({
      status: 'pending_tl',
      signed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateErr) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'DB_ERROR', message: updateErr.message } },
      { status: 500 }
    )
  }

  // Record in approval history
  await supabase.from('grd_approvals').insert({
    grd_id: id,
    approver_id: session.id,
    role: 'staff',
    action: 'signed',
  })

  await supabase.from('activity_logs').insert({
    table_name: 'goods_receipts',
    record_id: id,
    action: 'signed',
    actor_id: session.id,
    new_data: { status: 'pending_tl' },
  })

  // Notify team lead that GRD is pending their approval
  const { data: fullGrd } = await supabase
    .from('goods_receipts')
    .select('grd_number, team_lead:employees!team_lead_id(name, email)')
    .eq('id', id)
    .single()

  const tl = (fullGrd as any)?.team_lead
  if (tl?.email) {
    notifyPending(
      { docNumber: (fullGrd as any).grd_number, docType: 'GRD', docId: id, actorName: session.name, accessToken: session.zoho_access_token },
      { name: tl.name, email: tl.email }
    )
  }

  return NextResponse.json<ApiResponse<{ status: string }>>({
    success: true,
    data: { status: 'pending_tl' },
  })
}
