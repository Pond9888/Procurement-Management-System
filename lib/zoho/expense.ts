/**
 * Zoho Expense API client
 * Docs: https://www.zoho.com/expense/api/v1/
 *
 * All functions accept an access_token from the user's session.
 * Never store tokens beyond the session lifetime.
 */

const BASE_URL = process.env.ZOHO_EXPENSE_BASE_URL ?? 'https://expense.zoho.com/api/v1'

async function zohoFetch<T>(
  path: string,
  accessToken: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Zoho Expense API error ${res.status}: ${body}`)
  }

  return res.json()
}

// ---------------------------------------------------------------------------
// Types (raw Zoho API shape)
// ---------------------------------------------------------------------------

export interface ZohoPRItem {
  expense_id: string
  report_id: string
  report_number: string        // PR-02668
  report_name: string
  employee_id: string
  employee_name: string
  employee_email: string
  submitted_on: string         // ISO date
  approval_status: string      // Submitted | Approved | Rejected
  total: number
  currency_code: string
  custom_fields?: Array<{ label: string; value: string }>
}

export interface ZohoPRListResponse {
  code: number
  message: string
  expense_reports: ZohoPRItem[]
  page_context?: {
    page: number
    per_page: number
    has_more_page: boolean
  }
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/** Fetch all PRs accessible to the token holder (paginated) */
export async function fetchZohoPRList(
  accessToken: string,
  page = 1
): Promise<ZohoPRListResponse> {
  return zohoFetch<ZohoPRListResponse>(
    `/expensereports?page=${page}&per_page=100&sort_column=submitted_date&sort_order=descending`,
    accessToken
  )
}

/** Fetch a single PR by its Zoho report_id */
export async function fetchZohoPR(
  accessToken: string,
  reportId: string
): Promise<{ code: number; expense_report: ZohoPRItem }> {
  return zohoFetch(`/expensereports/${reportId}`, accessToken)
}

// ---------------------------------------------------------------------------
// Transform Zoho PR → Supabase purchase_requests row shape
// ---------------------------------------------------------------------------

export function mapZohoPRToRow(item: ZohoPRItem, submittedToId: string | null) {
  const cf = (label: string) =>
    item.custom_fields?.find((f) => f.label === label)?.value ?? null

  return {
    pr_number: item.report_number,
    pr_type: 'pr' as const,
    cf_company: cf('Company') ?? 'vertex_corp',
    status: 'submitted' as const,
    submitted_on: item.submitted_on,
    item_category: cf('Category') ?? null,
    reason: item.report_name,
    type_group: (cf('Type Group') as any) ?? null,
    type_expense: (cf('Type Expense') as any) ?? null,
    quantity: 1,
    discount: 0,
    amount: item.total,
    zoho_pr_id: item.report_id,
    raw_payload: item as unknown as Record<string, unknown>,
    submitted_to: submittedToId,
  }
}
