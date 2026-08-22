import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  PR_STATUS_LABEL,
  PR_STATUS_VARIANT,
  GRD_STATUS_LABEL,
  GRD_STATUS_VARIANT,
  formatTHB,
  formatDate,
} from '@/lib/utils'
import { PRActionButtons } from '@/components/pr/pr-action-buttons'
import { ApprovalTimeline } from '@/components/pr/approval-timeline'
import { RelatedDocs, type RelatedItem } from '@/components/shared/related-docs'
import type { PurchaseRequest, PRStatus, GRDStatus } from '@/types'

export const dynamic = 'force-dynamic'

async function getPR(id: string) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('purchase_requests')
    .select(
      `*, submitted_by_employee:employees!submitted_by(id, name, email, department, role),
       submitted_to_employee:employees!submitted_to(id, name, email, role),
       purchase_orders:purchase_orders(id, po_number, issued_date, total_amount),
       goods_receipts:goods_receipts(id, grd_number, status, total_amount, date_of_completion),
       approvals:pr_approvals(*, approver:employees(id, name, role))`
    )
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as unknown as PurchaseRequest
}

export default async function PRDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) return null

  const { id } = await params
  const pr = await getPR(id)
  if (!pr) notFound()

  // Staff access check
  if (
    session.role === 'staff' &&
    pr.submitted_by !== session.id &&
    pr.submitted_to !== session.id
  ) {
    notFound()
  }

  const isOwner = pr.submitted_by === session.id
  const canSign = isOwner && pr.status === 'submitted'

  const canApprove =
    (session.role === 'team_lead' && pr.status === 'pending_tl') ||
    (session.role === 'manager' && pr.status === 'pending_manager') ||
    (session.role === 'excom' && pr.status === 'pending_excom') ||
    session.role === 'admin'

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{pr.pr_number ?? 'PR (ไม่มีเลข)'}</h1>
            <Badge variant={PR_STATUS_VARIANT[pr.status as PRStatus]}>
              {PR_STATUS_LABEL[pr.status as PRStatus] ?? pr.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">{pr.reason ?? '—'}</p>
        </div>
        <PRActionButtons
          prId={pr.id}
          canSign={canSign}
          canApprove={canApprove}
          currentStatus={pr.status}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* PR Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">รายละเอียด PR</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="ประเภท PR" value={pr.pr_type?.toUpperCase() ?? '—'} />
            <Row label="บริษัท" value={pr.cf_company ?? '—'} />
            <Row label="หมวดหมู่" value={pr.item_category ?? '—'} />
            <Row label="ประเภทรายจ่าย" value={pr.type_expense ?? '—'} />
            <Row label="กลุ่ม" value={pr.type_group ?? '—'} />
            <Separator />
            <Row label="จำนวน" value={`${pr.quantity ?? 1} หน่วย`} />
            <Row label="ส่วนลด" value={formatTHB(pr.discount ?? 0)} />
            <Row label="มูลค่ารวม" value={formatTHB(pr.amount)} bold />
            {pr.amount_usd && (
              <Row label="มูลค่า (USD)" value={`$${pr.amount_usd.toFixed(2)}`} />
            )}
          </CardContent>
        </Card>

        {/* Dates & People */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">วันที่ & ผู้เกี่ยวข้อง</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="วันที่ยื่น" value={formatDate(pr.submitted_on)} />
            <Row label="วันที่ต้องการ" value={formatDate(pr.expected_date)} />
            {pr.signed_at && (
              <Row label="วันที่เซ็น" value={formatDate(pr.signed_at)} />
            )}
            {pr.approved_date && (
              <Row label="วันที่อนุมัติ" value={formatDate(pr.approved_date)} />
            )}
            <Separator />
            <Row
              label="ผู้ขอ"
              value={pr.submitted_by_employee?.name ?? '—'}
              sub={pr.submitted_by_employee?.department ?? undefined}
            />
            <Row
              label="ส่งถึง"
              value={pr.submitted_to_employee?.name ?? '—'}
            />
          </CardContent>
        </Card>
      </div>

      {/* Downstream documents on the same chain */}
      <RelatedDocs
        items={buildChain(pr)}
        title="เอกสารที่เกิดจาก PR นี้"
        emptyText="ยังไม่มีใบสั่งซื้อหรือใบรับสินค้าที่อ้างอิง PR ใบนี้"
      />

      {/* Approval timeline */}
      {pr.approvals && pr.approvals.length > 0 && (
        <ApprovalTimeline approvals={pr.approvals} />
      )}
    </div>
  )
}

/** PO(s) issued against this PR, then the GRD(s) received against those POs */
function buildChain(pr: any): RelatedItem[] {
  const asArray = (v: any) => (Array.isArray(v) ? v : v ? [v] : [])

  const pos: RelatedItem[] = asArray(pr.purchase_orders).map((po: any) => ({
    kind: 'PO' as const,
    number: po.po_number,
    href: `/po/${po.id}`,
    date: po.issued_date,
    dateLabel: 'ออกเมื่อ',
    amount: po.total_amount,
  }))

  const grds: RelatedItem[] = asArray(pr.goods_receipts).map((g: any) => ({
    kind: 'GRD' as const,
    number: g.grd_number,
    href: `/grd/${g.id}`,
    date: g.date_of_completion,
    dateLabel: 'รับงาน',
    amount: g.total_amount,
    status: {
      label: GRD_STATUS_LABEL[g.status as GRDStatus] ?? g.status,
      variant: GRD_STATUS_VARIANT[g.status as GRDStatus],
    },
  }))

  return [...pos, ...grds]
}

function Row({
  label,
  value,
  sub,
  bold,
}: {
  label: string
  value: string
  sub?: string
  bold?: boolean
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`text-right ${bold ? 'font-semibold text-base' : ''}`}>
        {value}
        {sub && <span className="block text-xs text-muted-foreground">{sub}</span>}
      </span>
    </div>
  )
}
