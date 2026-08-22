import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { GRD_STATUS_LABEL, GRD_STATUS_VARIANT, formatTHB, formatDate } from '@/lib/utils'
import type { GRDStatus } from '@/types'
import { Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getGRDs(userId: string, role: string, statusFilter: string | null, agingFilter: string | null) {
  const supabase = createServiceClient()

  let query = supabase
    .from('goods_receipts')
    .select(
      `id, grd_number, status, aging_status, total_amount, date_of_completion, created_at,
       vendor:vendors(name),
       purchase_order:purchase_orders(id, po_number),
       receiver:employees!receiver_id(name)`
    )
    .order('created_at', { ascending: false })
    .limit(100)

  if (role === 'staff') query = query.eq('receiver_id', userId)
  else if (role === 'team_lead') query = query.eq('team_lead_id', userId)

  if (statusFilter) query = query.eq('status', statusFilter)
  if (agingFilter) query = query.eq('aging_status', agingFilter)

  const { data, error } = await query
  return error ? [] : (data ?? [])
}

export default async function GRDListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const session = await getSession()
  if (!session) return null

  const params = await searchParams
  const statusFilter = params.status ?? null
  const agingFilter = params.aging ?? null

  const grds = await getGRDs(session.id, session.role, statusFilter, agingFilter)

  // Count pending for approvers
  const pendingCount = grds.filter((g: any) =>
    ['pending_tl', 'pending_manager', 'pending_input'].includes(g.status)
  ).length

  const STATUS_TABS = [
    { label: 'ทั้งหมด', value: null },
    { label: 'รอกรอกข้อมูล', value: 'pending_input' },
    { label: 'รอ Approve', value: 'pending_tl' },
    { label: 'อนุมัติแล้ว', value: 'approved' },
    { label: 'ไม่อนุมัติ', value: 'rejected' },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">ใบรับสินค้า/บริการ (GRD)</h1>
          <p className="text-sm text-muted-foreground mt-1">{grds.length} รายการ</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-2">
            <Clock className="h-4 w-4" />
            <span>{pendingCount} รายการรอดำเนินการ</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((tab) => {
          const href = tab.value ? `/grd?status=${tab.value}` : '/grd'
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
        <div className="ml-auto flex gap-2">
          <Link
            href="/grd?aging=pending"
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              agingFilter === 'pending'
                ? 'bg-amber-500 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Aging: Pending
          </Link>
          <Link
            href="/grd?aging=done"
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              agingFilter === 'done'
                ? 'bg-green-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Aging: Done
          </Link>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">GRD Number</th>
                <th className="text-left px-4 py-3 font-medium">Vendor</th>
                <th className="text-left px-4 py-3 font-medium">PO Number</th>
                <th className="text-left px-4 py-3 font-medium">ผู้รับผิดชอบ</th>
                <th className="text-left px-4 py-3 font-medium">วันรับงาน</th>
                <th className="text-right px-4 py-3 font-medium">มูลค่า</th>
                <th className="text-center px-4 py-3 font-medium">สถานะ</th>
                <th className="text-center px-4 py-3 font-medium">Aging</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {grds.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    ไม่พบรายการ
                  </td>
                </tr>
              )}
              {grds.map((grd: any) => (
                <tr key={grd.id} className="hover:bg-muted/30 cursor-pointer">
                  <td className="px-4 py-3">
                    <Link href={`/grd/${grd.id}`} className="font-medium hover:underline">
                      {grd.grd_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 max-w-[180px] truncate text-muted-foreground">
                    {grd.vendor?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {grd.purchase_order?.id ? (
                      <Link
                        href={`/po/${grd.purchase_order.id}`}
                        className="hover:underline"
                      >
                        {grd.purchase_order.po_number}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">{grd.receiver?.name ?? '—'}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
