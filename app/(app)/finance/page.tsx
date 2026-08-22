import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GRD_STATUS_LABEL, GRD_STATUS_VARIANT, formatTHB, formatDate } from '@/lib/utils'
import { FileText, Clock, CheckCircle, Banknote, AlertCircle } from 'lucide-react'
import type { GRDStatus } from '@/types'

export const dynamic = 'force-dynamic'

async function getFinanceData() {
  const supabase = createServiceClient()

  const { data: grds } = await supabase
    .from('goods_receipts')
    .select(
      `id, grd_number, status, aging_status, total_amount, date_of_completion,
       created_at, sent_to_finance_at, status_remark,
       vendor:vendors(name),
       purchase_order:purchase_orders(po_number, payment_terms),
       purchase_request:purchase_requests(pr_number, type_group, cf_company),
       receiver:employees!receiver_id(name),
       payment:payments(uv_number, pv_number, planned_date, paid_date, status)`
    )
    .order('created_at', { ascending: false })

  type Row = { status: string; aging_status: string; total_amount: number }
  const rows: Row[] = (grds ?? []) as Row[]

  const summary = {
    total: rows.length,
    pending_input: rows.filter((r) => ['draft', 'pending_input'].includes(r.status)).length,
    pending_approval: rows.filter((r) =>
      ['signed', 'pending_tl', 'pending_manager'].includes(r.status)
    ).length,
    approved_unpaid: rows.filter(
      (r) => r.status === 'approved' && r.aging_status === 'pending'
    ).length,
    paid: rows.filter((r) => r.aging_status === 'done').length,
    pending_amount: rows
      .filter((r) => r.status === 'approved' && r.aging_status === 'pending')
      .reduce((s, r) => s + (r.total_amount ?? 0), 0),
  }

  return { rows, summary }
}

export default async function FinanceDashboardPage() {
  const session = await getSession()
  if (!session) return null
  if (!['finance', 'admin', 'manager'].includes(session.role)) {
    redirect('/dashboard')
  }

  const { rows, summary } = await getFinanceData()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Finance Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">ภาพรวมการเงินและการชำระเงิน</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <SummaryCard
          title="GRD ทั้งหมด"
          value={summary.total}
          icon={FileText}
          href="/finance"
        />
        <SummaryCard
          title="รอกรอกข้อมูล"
          value={summary.pending_input}
          icon={Clock}
          href="/grd?status=pending_input"
          warn
        />
        <SummaryCard
          title="รอ Approve"
          value={summary.pending_approval}
          icon={AlertCircle}
          href="/grd?status=pending_tl"
          warn
        />
        <SummaryCard
          title="รอชำระเงิน"
          value={summary.approved_unpaid}
          icon={Banknote}
          href="/payments?status=pending"
          warn={summary.approved_unpaid > 0}
        />
        <SummaryCard
          title="ชำระแล้ว"
          value={summary.paid}
          icon={CheckCircle}
          href="/grd?aging=done"
          positive
        />
      </div>

      {/* Pending amount highlight */}
      {summary.pending_amount > 0 && (
        <Card className="border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10">
          <CardContent className="flex items-center gap-4 py-4">
            <Banknote className="h-8 w-8 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">ยอดรวมที่รอชำระเงิน</p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-200">{formatTHB(summary.pending_amount)}</p>
            </div>
            <Link href="/payments?status=pending" className="ml-auto text-sm font-medium text-amber-700 dark:text-amber-400 hover:underline">
              จัดการ Payment →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Full GRD table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">รายการ GRD ทั้งหมด</CardTitle>
          <Link href="/payments" className="text-sm text-primary hover:underline">
            จัดการ Payment →
          </Link>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">GRD</th>
                <th className="text-left px-4 py-3 font-medium">Vendor</th>
                <th className="text-left px-4 py-3 font-medium">PO</th>
                <th className="text-left px-4 py-3 font-medium">วันรับงาน</th>
                <th className="text-right px-4 py-3 font-medium">มูลค่า</th>
                <th className="text-center px-4 py-3 font-medium">สถานะ GRD</th>
                <th className="text-left px-4 py-3 font-medium">UV Number</th>
                <th className="text-left px-4 py-3 font-medium">วันชำระ</th>
                <th className="text-center px-4 py-3 font-medium">Aging</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-muted-foreground">
                    ไม่พบรายการ
                  </td>
                </tr>
              )}
              {rows.map((grd: any) => {
                const payment = Array.isArray(grd.payment) ? grd.payment[0] : grd.payment
                return (
                  <tr key={grd.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/grd/${grd.id}`} className="hover:underline">
                        {grd.grd_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 max-w-[140px] truncate text-muted-foreground">
                      {grd.vendor?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{grd.purchase_order?.po_number ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {grd.date_of_completion ? formatDate(grd.date_of_completion) : (
                        <span className="text-muted-foreground italic text-xs">ยังไม่ได้กรอก</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                      {formatTHB(grd.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={GRD_STATUS_VARIANT[grd.status as GRDStatus]}>
                        {GRD_STATUS_LABEL[grd.status as GRDStatus] ?? grd.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{payment?.uv_number ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {payment?.paid_date ? formatDate(payment.paid_date) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          grd.aging_status === 'done'
                            ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400'
                            : 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {grd.aging_status === 'done' ? 'Done' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function SummaryCard({
  title, value, icon: Icon, href, warn, positive,
}: {
  title: string
  value: number
  icon: React.ElementType
  href: string
  warn?: boolean
  positive?: boolean
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
          <Icon className={`h-4 w-4 ${positive ? 'text-green-500' : warn && value > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
        </CardHeader>
        <CardContent>
          <p className={`text-3xl font-bold ${warn && value > 0 ? 'text-amber-600' : positive ? 'text-green-600 dark:text-green-400' : ''}`}>
            {value}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
