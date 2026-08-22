import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  GRD_STATUS_LABEL,
  GRD_STATUS_VARIANT,
  PR_STATUS_LABEL,
  PR_STATUS_VARIANT,
  formatTHB,
  formatDate,
} from '@/lib/utils'
import { GRDInputForm } from '@/components/grd/grd-input-form'
import { GRDActionButtons } from '@/components/grd/grd-action-buttons'
import { PDFButton } from '@/components/grd/pdf-button'
import { DocUpload } from '@/components/grd/doc-upload'
import { ApprovalTimeline } from '@/components/pr/approval-timeline'
import { PipelineTrack } from '@/components/pipeline/pipeline-track'
import { RelatedDocs, type RelatedItem } from '@/components/shared/related-docs'
import { buildGRDPipeline } from '@/lib/pipeline'
import type { GoodsReceipt, GRDStatus, PRStatus } from '@/types'

export const dynamic = 'force-dynamic'

async function getGRD(id: string) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('goods_receipts')
    .select(
      `*, vendor:vendors(*), customer:customers(*),
       purchase_order:purchase_orders(*, vendor:vendors(*)),
       purchase_request:purchase_requests(id, pr_number, amount, type_group, status, submitted_on, approved_date),
       payment:payments(id, status, paid_date, uv_number, pv_number, amount, planned_date),
       receiver:employees!receiver_id(id, name, email, department, role),
       team_lead:employees!team_lead_id(id, name, email, role),
       manager:employees!manager_id(id, name, email, role),
       approvals:grd_approvals(*, approver:employees(id, name, role))`
    )
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data as unknown as GoodsReceipt
}

async function getApprovers() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('employees')
    .select('id, name, role')
    .in('role', ['team_lead', 'manager'])
    .eq('is_active', true)
    .order('name')
  return data ?? []
}

export default async function GRDDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) return null

  const { id } = await params
  const [grd, approvers] = await Promise.all([getGRD(id), getApprovers()])
  if (!grd) notFound()

  // Staff access check
  if (session.role === 'staff' && grd.receiver_id !== session.id) notFound()

  const teamLeads = approvers.filter((e: any) => e.role === 'team_lead')
  const managers = approvers.filter((e: any) => e.role === 'manager')

  const isReceiver = grd.receiver_id === session.id || !grd.receiver_id
  const canEdit = isReceiver && ['pending_input', 'draft'].includes(grd.status)
  const canSign = isReceiver && grd.status === 'pending_input' && !!grd.date_of_completion

  const canApprove =
    (session.role === 'team_lead' && grd.status === 'pending_tl') ||
    (session.role === 'manager' && grd.status === 'pending_manager') ||
    session.role === 'admin'

  const grdPayment = Array.isArray((grd as any).payment)
    ? (grd as any).payment[0]
    : (grd as any).payment

  const pipeline = buildGRDPipeline({
    grd: grd as any,
    pr: (grd as any).purchase_request,
    po: (grd as any).purchase_order,
    payment: grdPayment,
  })

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Pipeline */}
      <PipelineTrack
        docNumber={grd.grd_number}
        pipeline={pipeline}
        meta={`อัปเดตล่าสุด ${formatDate((grd as any).updated_at)}`}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{grd.grd_number}</h1>
            <Badge variant={GRD_STATUS_VARIANT[grd.status as GRDStatus]}>
              {GRD_STATUS_LABEL[grd.status as GRDStatus] ?? grd.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {(grd as any).vendor?.name ?? '—'} —{' '}
            {(grd as any).purchase_order?.po_number ?? '—'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <GRDActionButtons
            grdId={grd.id}
            canSign={canSign}
            canApprove={canApprove}
            currentStatus={grd.status as GRDStatus}
          />
          {grd.status === 'approved' && (
            <PDFButton grdId={grd.id} existingUrl={grd.signed_pdf_url ?? null} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Amount details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">รายละเอียดการเงิน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="คำอธิบาย" value={grd.description} />
            <Row label="หมวดหมู่" value={grd.product_category ?? '—'} />
            <Separator />
            <Row label="มูลค่าก่อน VAT" value={formatTHB(grd.amount)} />
            <Row label={`VAT ${grd.vat_rate}%`} value={formatTHB(grd.vat_amount)} />
            <Row label="มูลค่ารวม" value={formatTHB(grd.total_amount)} bold />
            {grd.amount_in_words && (
              <p className="text-xs text-muted-foreground italic border-t pt-2">
                {grd.amount_in_words}
              </p>
            )}
          </CardContent>
        </Card>

        {/* People */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ผู้เกี่ยวข้อง</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Vendor" value={(grd as any).vendor?.name ?? '—'} />
            <Row label="Customer" value={(grd as any).customer?.code ?? '—'} />
            <Separator />
            <Row label="ผู้รับผิดชอบ" value={grd.receiver?.name ?? '—'} />
            <Row label="Team Lead" value={grd.team_lead?.name ?? '—'} />
            <Row label="Manager" value={grd.manager?.name ?? '—'} />
          </CardContent>
        </Card>
      </div>

      {/* Upstream + downstream documents on the same chain */}
      <RelatedDocs items={buildChain(grd as any, grdPayment)} />

      {/* Input form (staff fills when pending_input) */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">กรอกข้อมูล GRD</CardTitle>
          </CardHeader>
          <CardContent>
            <GRDInputForm
              grdId={grd.id}
              defaultValues={{
                date_of_completion: grd.date_of_completion,
                remark: grd.remark,
                team_lead_id: grd.team_lead_id,
                manager_id: grd.manager_id,
              }}
              teamLeads={teamLeads}
              managers={managers}
            />
          </CardContent>
        </Card>
      )}

      {/* Supporting docs — editable when pending_input/draft, read-only otherwise */}
      {(canEdit || (grd.supporting_docs && (grd.supporting_docs as any[]).length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">เอกสารแนบ</CardTitle>
          </CardHeader>
          <CardContent>
            {canEdit ? (
              <DocUpload
                grdId={grd.id}
                initialDocs={(grd.supporting_docs as any[]) ?? []}
              />
            ) : (
              <ul className="space-y-2">
                {(grd.supporting_docs as any[]).map((doc, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate"
                    >
                      {doc.name}
                    </a>
                    <span className="text-xs text-muted-foreground ml-4 shrink-0">
                      {doc.type} · {(doc.size / 1024).toFixed(0)} KB
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approval timeline */}
      {grd.approvals && grd.approvals.length > 0 && (
        <ApprovalTimeline approvals={grd.approvals as any} />
      )}
    </div>
  )
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'รอชำระ',
  invoiced: 'รับ Invoice แล้ว',
  paid: 'ชำระแล้ว',
}

/** The PR and PO this GRD came from, plus the payment it produced */
function buildChain(grd: any, payment: any): RelatedItem[] {
  const items: RelatedItem[] = []

  if (grd.purchase_request?.id) {
    items.push({
      kind: 'PR',
      number: grd.purchase_request.pr_number ?? 'PR (ไม่มีเลข)',
      href: `/pr/${grd.purchase_request.id}`,
      date: grd.purchase_request.submitted_on,
      dateLabel: 'ยื่นเมื่อ',
      amount: grd.purchase_request.amount,
      status: {
        label: PR_STATUS_LABEL[grd.purchase_request.status as PRStatus] ?? grd.purchase_request.status,
        variant: PR_STATUS_VARIANT[grd.purchase_request.status as PRStatus],
      },
    })
  }

  if (grd.purchase_order?.id) {
    items.push({
      kind: 'PO',
      number: grd.purchase_order.po_number,
      href: `/po/${grd.purchase_order.id}`,
      date: grd.purchase_order.issued_date,
      dateLabel: 'ออกเมื่อ',
      amount: grd.purchase_order.total_amount,
    })
  }

  if (payment) {
    items.push({
      kind: 'PAYMENT',
      number: payment.pv_number ?? payment.uv_number ?? 'ยังไม่มีเลข UV/PV',
      href: '/payments',
      date: payment.paid_date ?? payment.planned_date,
      dateLabel: payment.paid_date ? 'จ่ายเมื่อ' : 'นัดจ่าย',
      amount: payment.amount,
      status: {
        label: PAYMENT_STATUS_LABEL[payment.status] ?? payment.status,
        variant: payment.status === 'paid' ? 'default' : 'secondary',
      },
    })
  }

  return items
}

function Row({
  label,
  value,
  bold,
  mono,
}: {
  label: string
  value: string
  bold?: boolean
  mono?: boolean
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span
        className={[
          'text-right',
          bold ? 'font-semibold text-base' : '',
          mono ? 'font-mono text-xs' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {value}
      </span>
    </div>
  )
}
