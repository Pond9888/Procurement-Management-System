import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PR_STATUS_LABEL, PR_STATUS_VARIANT, formatTHB, formatDate } from '@/lib/utils'
import type { PRStatus } from '@/types'
import { RefreshCw, Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getPRs(userId: string, role: string, statusFilter: string | null) {
  const supabase = createServiceClient()

  let query = supabase
    .from('purchase_requests')
    .select(
      `id, pr_number, pr_type, status, submitted_on, amount, cf_company, reason,
       type_group, type_expense,
       submitted_by_employee:employees!submitted_by(name, department)`
    )
    .order('submitted_on', { ascending: false })
    .limit(100)

  if (role === 'staff') query = query.eq('submitted_by', userId)
  if (statusFilter) query = query.eq('status', statusFilter)

  const { data, error } = await query
  return error ? [] : (data ?? [])
}

export default async function PRListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const session = await getSession()
  if (!session) return null

  const params = await searchParams
  const statusFilter = params.status ?? null

  const prs = await getPRs(session.id, session.role, statusFilter)

  const STATUS_TABS: Array<{ label: string; value: string | null }> = [
    { label: 'ทั้งหมด', value: null },
    { label: 'รอเซ็น', value: 'submitted' },
    { label: 'รอ Approve', value: 'pending_tl' },
    { label: 'อนุมัติแล้ว', value: 'approved' },
    { label: 'ไม่อนุมัติ', value: 'rejected' },
  ]

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">ใบขอซื้อ (PR)</h1>
          <p className="text-sm text-muted-foreground mt-1">{prs.length} รายการ</p>
        </div>
        <div className="flex items-center gap-2">
          <form action="/api/pr" method="POST">
            <Button variant="outline" size="sm" type="submit">
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync จาก Zoho
            </Button>
          </form>
          {/* Button has no asChild — style the link with the shared variants */}
          <Link href="/pr/new" className={buttonVariants({ size: 'sm' })}>
            <Plus className="h-4 w-4 mr-2" />
            สร้างใบขอซื้อ
          </Link>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((tab) => {
          const href = tab.value ? `/pr?status=${tab.value}` : '/pr'
          const active = statusFilter === tab.value
          return (
            <Link
              key={tab.label}
              href={href}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">PR Number</th>
                <th className="text-left px-4 py-3 font-medium">เหตุผล</th>
                <th className="text-left px-4 py-3 font-medium">ผู้ขอ</th>
                <th className="text-left px-4 py-3 font-medium">วันที่</th>
                <th className="text-right px-4 py-3 font-medium">มูลค่า</th>
                <th className="text-center px-4 py-3 font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {prs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    ไม่พบรายการ
                  </td>
                </tr>
              )}
              {prs.map((pr: any) => (
                <tr key={pr.id} className="hover:bg-muted/30 cursor-pointer">
                  <td className="px-4 py-3">
                    <Link href={`/pr/${pr.id}`} className="font-medium hover:underline">
                      {pr.pr_number ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">
                    {pr.reason ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {pr.submitted_by_employee?.name ?? '—'}
                    {pr.submitted_by_employee?.department && (
                      <span className="block text-xs text-muted-foreground">
                        {pr.submitted_by_employee.department}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDate(pr.submitted_on)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                    {formatTHB(pr.amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={PR_STATUS_VARIANT[pr.status as PRStatus]}>
                      {PR_STATUS_LABEL[pr.status as PRStatus] ?? pr.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
