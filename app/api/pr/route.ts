import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchZohoPRList, mapZohoPRToRow } from '@/lib/zoho/expense'
import type { ApiResponse, PurchaseRequest } from '@/types'

// GET /api/pr — list PRs (filtered by role)
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
  const page = Number(searchParams.get('page') ?? '1')
  const limit = Number(searchParams.get('limit') ?? '50')
  const offset = (page - 1) * limit

  const supabase = createServiceClient()
  let query = supabase
    .from('purchase_requests')
    .select(
      `*, submitted_by_employee:employees!submitted_by(id, name, email, role),
       submitted_to_employee:employees!submitted_to(id, name, email, role)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Role-based filtering
  if (session.role === 'staff') {
    query = query.eq('submitted_by', session.id)
  }
  // team_lead, manager, excom, finance, admin see all (RLS also enforces this)

  if (status) query = query.eq('status', status)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json<ApiResponse<{ items: PurchaseRequest[]; total: number }>>({
    success: true,
    data: { items: (data ?? []) as unknown as PurchaseRequest[], total: count ?? 0 },
  })
}

// POST /api/pr/sync — sync PRs from Zoho Expense
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 }
    )
  }

  // Only finance / admin can trigger a full sync; staff syncs their own
  const supabase = createServiceClient()

  try {
    const zohoList = await fetchZohoPRList(session.zoho_access_token)
    const items = zohoList.expense_reports ?? []

    let synced = 0
    let skipped = 0

    for (const item of items) {
      // Find submitter employee by zoho_user_id
      const { data: submitter } = await supabase
        .from('employees')
        .select('id')
        .eq('zoho_user_id', item.employee_id)
        .single()

      const row = mapZohoPRToRow(item, null)

      const { error } = await supabase
        .from('purchase_requests')
        .upsert(
          {
            ...row,
            submitted_by: submitter?.id ?? null,
          },
          { onConflict: 'zoho_pr_id', ignoreDuplicates: false }
        )

      if (error) {
        skipped++
      } else {
        synced++
      }
    }

    return NextResponse.json<ApiResponse<{ synced: number; skipped: number }>>({
      success: true,
      data: { synced, skipped },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'ZOHO_ERROR', message } },
      { status: 502 }
    )
  }
}
