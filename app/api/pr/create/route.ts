import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse, PRType, TypeGroup, TypeExpense } from '@/types'

/**
 * POST /api/pr/create
 *
 * Raises a purchase request inside this app, for spend that never passes
 * through Zoho Expense (recurring bills, advances, no-PR purchases) or when
 * Zoho is unavailable. The request enters the normal chain at `submitted`,
 * so the requester still has to sign it before it reaches a Team Lead.
 *
 * Zoho-synced PRs keep their own numbering; ones raised here get an
 * internal running number so both kinds stay distinguishable.
 */

const PR_TYPES: PRType[] = ['pr', 'fixed', 'no_pr', 'advance']
const TYPE_GROUPS: TypeGroup[] = ['PO', 'Fixed', 'Bill', 'Card', 'Advance']
const TYPE_EXPENSES: TypeExpense[] = [
  'COGS', 'OPEX', 'Asset', 'Infra', 'Marketing', 'Taxes', 'Training', 'Expense',
]
const COMPANIES = ['vertex_corp', 'vertex_infosec']

interface CreatePRBody {
  pr_type: PRType
  cf_company: string
  submitted_on: string
  expected_date?: string | null
  submitted_to?: string | null
  item_category?: string | null
  reason: string
  type_group: TypeGroup
  type_expense: TypeExpense
  quantity?: number
  discount?: number
  amount: number
}

function fail(code: string, message: string, status: number) {
  return NextResponse.json<ApiResponse<never>>(
    { success: false, error: { code, message } },
    { status }
  )
}

/** PR-IN-<พ.ศ. 2 หลัก>-<running 4 หลัก> — e.g. PR-IN-69-0007 */
async function nextInternalNumber(supabase: any, submittedOn: string): Promise<string> {
  const year = new Date(submittedOn).getFullYear() + 543
  const prefix = `PR-IN-${String(year).slice(-2)}-`

  const { data } = await supabase
    .from('purchase_requests')
    .select('pr_number')
    .like('pr_number', `${prefix}%`)

  const highest = (data ?? []).reduce((max: number, row: { pr_number: string | null }) => {
    const n = Number(row.pr_number?.slice(prefix.length))
    return Number.isFinite(n) && n > max ? n : max
  }, 0)

  return `${prefix}${String(highest + 1).padStart(4, '0')}`
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return fail('UNAUTHENTICATED', 'Not logged in', 401)

  let body: CreatePRBody
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION', 'ส่งข้อมูลมาไม่ถูกต้อง', 400)
  }

  // ── validation ────────────────────────────────────────────────
  if (!body.reason?.trim()) {
    return fail('VALIDATION', 'กรุณากรอกเหตุผล/รายละเอียดที่ขอซื้อ', 400)
  }
  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return fail('VALIDATION', 'จำนวนเงินต้องมากกว่า 0', 400)
  }
  if (!body.submitted_on) {
    return fail('VALIDATION', 'กรุณาระบุวันที่ยื่น', 400)
  }
  if (!COMPANIES.includes(body.cf_company)) {
    return fail('VALIDATION', 'กรุณาเลือกบริษัท', 400)
  }
  if (!PR_TYPES.includes(body.pr_type)) {
    return fail('VALIDATION', 'ประเภท PR ไม่ถูกต้อง', 400)
  }
  if (!TYPE_GROUPS.includes(body.type_group)) {
    return fail('VALIDATION', 'กลุ่มรายจ่ายไม่ถูกต้อง', 400)
  }
  if (!TYPE_EXPENSES.includes(body.type_expense)) {
    return fail('VALIDATION', 'ประเภทรายจ่ายไม่ถูกต้อง', 400)
  }

  const discount = Number(body.discount ?? 0)
  const quantity = Number(body.quantity ?? 1)
  if (discount < 0 || quantity <= 0) {
    return fail('VALIDATION', 'จำนวนและส่วนลดต้องเป็นค่าที่ถูกต้อง', 400)
  }
  if (body.expected_date && body.expected_date < body.submitted_on) {
    return fail('VALIDATION', 'วันที่ต้องการต้องไม่ก่อนวันที่ยื่น', 400)
  }

  const supabase = createServiceClient()
  const now = new Date().toISOString()
  const pr_number = await nextInternalNumber(supabase, body.submitted_on)

  const { data: pr, error } = await supabase
    .from('purchase_requests')
    .insert({
      pr_number,
      pr_type: body.pr_type,
      cf_company: body.cf_company,
      status: 'submitted',
      submitted_by: session.id,
      submitted_to: body.submitted_to || null,
      submitted_on: body.submitted_on,
      expected_date: body.expected_date || null,
      item_category: body.item_category?.trim() || null,
      reason: body.reason.trim(),
      type_group: body.type_group,
      type_expense: body.type_expense,
      quantity,
      discount,
      amount,
      zoho_pr_id: null,
      created_at: now,
      updated_at: now,
    })
    .select('id, pr_number')
    .single()

  if (error || !pr) {
    return fail('DB_ERROR', error?.message ?? 'สร้างใบขอซื้อไม่สำเร็จ', 500)
  }

  await supabase.from('activity_logs').insert({
    table_name: 'purchase_requests',
    record_id: pr.id,
    action: 'created',
    actor_id: session.id,
    new_data: { pr_number: pr.pr_number, amount, source: 'in_app' },
  })

  return NextResponse.json<ApiResponse<{ id: string; pr_number: string }>>({
    success: true,
    data: { id: pr.id, pr_number: pr.pr_number },
  })
}
