import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { notifyApproved, notifyRejected, notifyPending } from '@/lib/zoho/notify'
import type { ApiResponse, EmployeeRole, PRStatus } from '@/types'

interface ApproveBody {
  action: 'approved' | 'rejected'
  comment?: string
}

/**
 * POST /api/pr/[id]/approve
 * Team Lead / Manager / ExCom approve or reject a PR.
 *
 * Approval state machine:
 *   pending_tl    → (team_lead)  → pending_manager | rejected
 *   pending_manager → (manager)  → pending_excom | approved | rejected
 *   pending_excom → (excom)      → approved | rejected
 *
 * ExCom step is only reached when amount > threshold (handled by who routes it).
 * For now: manager decides whether to escalate to excom or approve directly.
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

  // Only approvers
  if (!(['team_lead', 'manager', 'excom', 'admin'] as EmployeeRole[]).includes(session.role)) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์ Approve PR' } },
      { status: 403 }
    )
  }

  const { id } = await params
  const body: ApproveBody = await req.json()

  if (!body.action || !['approved', 'rejected'].includes(body.action)) {
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

  // 1. Fetch current PR with submitter info
  const { data: pr, error: fetchErr } = await supabase
    .from('purchase_requests')
    .select(`id, status, amount, pr_number,
      submitter:employees!submitted_by(name, email)`)
    .eq('id', id)
    .single()

  if (fetchErr || !pr) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'NOT_FOUND', message: 'PR not found' } },
      { status: 404 }
    )
  }

  // 2. Validate that the current approver matches the expected stage
  const stageRoleMap: Partial<Record<PRStatus, EmployeeRole[]>> = {
    pending_tl: ['team_lead', 'admin'],
    pending_manager: ['manager', 'admin'],
    pending_excom: ['excom', 'admin'],
  }

  const allowedRoles = stageRoleMap[pr.status as PRStatus]
  if (!allowedRoles || !allowedRoles.includes(session.role)) {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `PR สถานะ "${pr.status}" ไม่รอการอนุมัติจาก role "${session.role}"`,
        },
      },
      { status: 422 }
    )
  }

  // 3. Determine next status
  let nextStatus: PRStatus
  if (body.action === 'rejected') {
    nextStatus = 'rejected'
  } else if (pr.status === 'pending_tl') {
    nextStatus = 'pending_manager'
  } else if (pr.status === 'pending_manager') {
    // ExCom threshold: > 500,000 THB (configurable)
    const EXCOM_THRESHOLD = 500_000
    nextStatus = pr.amount > EXCOM_THRESHOLD ? 'pending_excom' : 'approved'
  } else {
    // pending_excom → approved
    nextStatus = 'approved'
  }

  // 4. Update PR status
  const updateData: Record<string, unknown> = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
  }
  if (nextStatus === 'approved') {
    updateData.approved_date = new Date().toISOString().split('T')[0]
  }

  const { error: updateErr } = await supabase
    .from('purchase_requests')
    .update(updateData)
    .eq('id', id)

  if (updateErr) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'DB_ERROR', message: updateErr.message } },
      { status: 500 }
    )
  }

  // 5. Record approval history
  await supabase.from('pr_approvals').insert({
    pr_id: id,
    approver_id: session.id,
    role: session.role,
    action: body.action,
    comment: body.comment ?? null,
  })

  // 6. Audit log
  await supabase.from('activity_logs').insert({
    table_name: 'purchase_requests',
    record_id: id,
    action: body.action,
    actor_id: session.id,
    old_data: { status: pr.status },
    new_data: { status: nextStatus },
  })

  // 7. Fire-and-forget notifications
  const notifyCtx = {
    docNumber: (pr as any).pr_number ?? id,
    docType: 'PR' as const,
    docId: id,
    actorName: session.name,
    accessToken: session.zoho_access_token,
  }
  const submitter = (pr as any).submitter

  if (body.action === 'rejected') {
    notifyRejected(notifyCtx, body.comment, submitter?.email ? submitter : undefined)
  } else if (nextStatus === 'pending_manager' || nextStatus === 'pending_excom') {
    // Approved by TL/Manager → notify next approver via Cliq channel
    notifyPending(notifyCtx, { name: `(${nextStatus})`, email: '' })
    if (submitter?.email) notifyApproved(notifyCtx, session.role, submitter)
  } else if (nextStatus === 'approved') {
    if (submitter?.email) notifyApproved(notifyCtx, session.role, submitter)
  }

  return NextResponse.json<ApiResponse<{ status: PRStatus }>>({
    success: true,
    data: { status: nextStatus },
  })
}
