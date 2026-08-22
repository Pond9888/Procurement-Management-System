import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { notifyApproved, notifyRejected, notifyPending, notifyFullyApproved } from '@/lib/zoho/notify'
import type { ApiResponse, EmployeeRole, GRDStatus } from '@/types'

interface ApproveBody {
  action: 'approved' | 'rejected'
  comment?: string
}

/**
 * POST /api/grd/[id]/approve
 * GRD approval state machine:
 *   pending_tl      → (team_lead) → pending_manager | rejected
 *   pending_manager → (manager)   → approved | rejected
 */
export async function POST(
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

  if (!(['team_lead', 'manager', 'admin'] as EmployeeRole[]).includes(session.role)) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์ Approve GRD' } },
      { status: 403 }
    )
  }

  const { id } = await params
  const body: ApproveBody = await req.json()

  if (!['approved', 'rejected'].includes(body.action)) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'VALIDATION', message: 'action ต้องเป็น approved หรือ rejected' } },
      { status: 400 }
    )
  }
  if (body.action === 'rejected' && !body.comment?.trim()) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'VALIDATION', message: 'กรุณาระบุเหตุผลในการไม่อนุมัติ' } },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  const { data: grd, error: fetchErr } = await supabase
    .from('goods_receipts')
    .select(`id, status, grd_number, team_lead_id, manager_id, total_amount,
      receiver:employees!receiver_id(name, email),
      team_lead:employees!team_lead_id(name, email),
      manager:employees!manager_id(name, email)`)
    .eq('id', id)
    .single()

  if (fetchErr || !grd) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'NOT_FOUND', message: 'GRD not found' } },
      { status: 404 }
    )
  }

  // Validate role matches current stage
  const stageRoleMap: Partial<Record<GRDStatus, EmployeeRole[]>> = {
    pending_tl: ['team_lead', 'admin'],
    pending_manager: ['manager', 'admin'],
  }

  const allowedRoles = stageRoleMap[grd.status as GRDStatus]
  if (!allowedRoles || !allowedRoles.includes(session.role)) {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `GRD สถานะ "${grd.status}" ไม่รอการอนุมัติจาก role "${session.role}"`,
        },
      },
      { status: 422 }
    )
  }

  // Determine next status
  let nextStatus: GRDStatus
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.action === 'rejected') {
    nextStatus = 'rejected'
  } else if (grd.status === 'pending_tl') {
    nextStatus = 'pending_manager'
    updateData.tl_approved_at = new Date().toISOString()
    // Auto-assign manager if not set (use session user)
    if (!grd.manager_id) updateData.manager_id = session.id
  } else {
    // pending_manager → approved
    nextStatus = 'approved'
    updateData.manager_approved_at = new Date().toISOString()
  }

  updateData.status = nextStatus

  const { error: updateErr } = await supabase
    .from('goods_receipts')
    .update(updateData)
    .eq('id', id)

  if (updateErr) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'DB_ERROR', message: updateErr.message } },
      { status: 500 }
    )
  }

  // Record approval history
  await supabase.from('grd_approvals').insert({
    grd_id: id,
    approver_id: session.id,
    role: session.role,
    action: body.action,
    comment: body.comment ?? null,
  })

  await supabase.from('activity_logs').insert({
    table_name: 'goods_receipts',
    record_id: id,
    action: body.action,
    actor_id: session.id,
    old_data: { status: grd.status },
    new_data: { status: nextStatus },
  })

  // Fire-and-forget notifications
  const notifyCtx = {
    docNumber: (grd as any).grd_number,
    docType: 'GRD' as const,
    docId: id,
    actorName: session.name,
    accessToken: session.zoho_access_token,
  }
  const receiver = (grd as any).receiver
  const manager = (grd as any).manager

  if (body.action === 'rejected') {
    notifyRejected(notifyCtx, body.comment, receiver?.email ? receiver : undefined)
  } else if (nextStatus === 'pending_manager') {
    // TL approved → notify manager
    if (manager?.email) notifyPending(notifyCtx, { name: manager.name, email: manager.email })
    if (receiver?.email) notifyApproved(notifyCtx, 'Team Lead', receiver)
  } else if (nextStatus === 'approved') {
    // Manager approved → fully approved
    notifyFullyApproved(notifyCtx)
    if (receiver?.email) notifyApproved(notifyCtx, 'Manager', receiver)
  }

  return NextResponse.json<ApiResponse<{ status: GRDStatus }>>({
    success: true,
    data: { status: nextStatus },
  })
}
