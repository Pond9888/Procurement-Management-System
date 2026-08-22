import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

/**
 * POST /api/pr/[id]/sign
 * Staff signs their own PR → status: submitted → signed → pending_tl
 *
 * State machine: only allowed when status = 'submitted'
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

  // 1. Fetch current PR — server-side validation
  const { data: pr, error: fetchErr } = await supabase
    .from('purchase_requests')
    .select('id, status, submitted_by, submitted_to')
    .eq('id', id)
    .single()

  if (fetchErr || !pr) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'NOT_FOUND', message: 'PR not found' } },
      { status: 404 }
    )
  }

  // 2. Only the PR owner can sign
  if (pr.submitted_by !== session.id) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้สร้าง PR เท่านั้นที่เซ็นได้' } },
      { status: 403 }
    )
  }

  // 3. State check — must be 'submitted'
  if (pr.status !== 'submitted') {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: 'INVALID_STATE', message: `ไม่สามารถเซ็น PR ที่มีสถานะ "${pr.status}" ได้` },
      },
      { status: 422 }
    )
  }

  // 4. Update status → pending_tl (staff has signed, now waiting for Team Lead)
  const { error: updateErr } = await supabase
    .from('purchase_requests')
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

  // 5. Log the action
  await supabase.from('activity_logs').insert({
    table_name: 'purchase_requests',
    record_id: id,
    action: 'signed',
    actor_id: session.id,
    new_data: { status: 'pending_tl' },
  })

  return NextResponse.json<ApiResponse<{ status: string }>>({
    success: true,
    data: { status: 'pending_tl' },
  })
}
