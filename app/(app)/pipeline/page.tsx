import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PipelineTrack } from '@/components/pipeline/pipeline-track'
import { GRDActionButtons } from '@/components/grd/grd-action-buttons'
import { PDFButton } from '@/components/grd/pdf-button'
import { ApprovalTimeline } from '@/components/pr/approval-timeline'
import { buildGRDPipeline } from '@/lib/pipeline'
import {
  GRD_STATUS_LABEL,
  GRD_STATUS_VARIANT,
  formatTHB,
  formatDate,
} from '@/lib/utils'
import type { GRDStatus } from '@/types'
import { Workflow, FileText, PenLine, History, Paperclip } from 'lucide-react'

export const dynamic = 'force-dynamic'

const TAB_KEYS = ['doc', 'approve', 'activity'] as const
type TabKey = (typeof TAB_KEYS)[number]

const STATUS_DOT: Record<string, string> = {
  draft: '#8892a4',
  pending_input: '#f5a623',
  signed: '#4f8ef7',
  pending_tl: '#4f8ef7',
  pending_manager: '#a78bfa',
  approved: '#22d87a',
  rejected: '#f25f5c',
}

/**
 * Documents shown as tabs — scoped to what this role is allowed to see.
 * `requestedId` is pinned to the front when it falls outside the recent window,
 * so a deep link never silently opens a different document.
 */
async function getOpenDocs(userId: string, role: string, requestedId?: string) {
  const supabase = createServiceClient()
  let query = supabase
    .from('goods_receipts')
    .select('id, grd_number, status, created_at')
    .order('created_at', { ascending: false })
    .limit(8)

  if (role === 'staff') query = query.eq('receiver_id', userId)
  else if (role === 'team_lead') query = query.eq('team_lead_id', userId)

  const { data } = await query
  const docs = data ?? []

  if (requestedId && !docs.some((d: any) => d.id === requestedId)) {
    let pinned = supabase
      .from('goods_receipts')
      .select('id, grd_number, status, created_at')
      .eq('id', requestedId)

    if (role === 'staff') pinned = pinned.eq('receiver_id', userId)
    else if (role === 'team_lead') pinned = pinned.eq('team_lead_id', userId)

    const { data: extra } = await pinned
    if (extra?.length) return [extra[0], ...docs]
  }

  return docs
}

async function getDoc(id: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('goods_receipts')
    .select(
      `*, vendor:vendors(name, tax_id), customer:customers(code, name_th),
       purchase_order:purchase_orders(po_number, issued_date, payment_terms),
       purchase_request:purchase_requests(pr_number, status, submitted_on, approved_date, amount),
       receiver:employees!receiver_id(id, name, department),
       team_lead:employees!team_lead_id(id, name),
       manager:employees!manager_id(id, name),
       payment:payments(uv_number, pv_number, status, paid_date, planned_date),
       approvals:grd_approvals(*, approver:employees(id, name, role))`
    )
    .eq('id', id)
    .single()
  return data
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const session = await getSession()
  if (!session) return null

  const params = await searchParams
  const docs = await getOpenDocs(session.id, session.role, params.doc)

  if (docs.length === 0) {
    return (
      <div className="p-6">
        <PageHeading />
        <Card className="mt-6">
          <CardContent className="py-16 text-center text-muted-foreground">
            ยังไม่มีเอกสารในสายงานของคุณ
          </CardContent>
        </Card>
      </div>
    )
  }

  const activeId = docs.some((d: any) => d.id === params.doc) ? params.doc : docs[0].id
  const tab: TabKey = TAB_KEYS.includes(params.tab as TabKey) ? (params.tab as TabKey) : 'doc'

  const grd: any = await getDoc(activeId)
  if (!grd) return null

  const payment = Array.isArray(grd.payment) ? grd.payment[0] : grd.payment

  const pipeline = buildGRDPipeline({
    grd,
    pr: grd.purchase_request,
    po: grd.purchase_order,
    payment,
  })

  const isReceiver = grd.receiver_id === session.id || !grd.receiver_id
  const canSign =
    isReceiver && grd.status === 'pending_input' && Boolean(grd.date_of_completion)
  const canApprove =
    (session.role === 'team_lead' && grd.status === 'pending_tl') ||
    (session.role === 'manager' && grd.status === 'pending_manager') ||
    session.role === 'admin'

  const tabHref = (t: TabKey) => `/pipeline?doc=${activeId}&tab=${t}`

  return (
    <div className="flex flex-col">
      <div className="px-6 pt-6">
        <PageHeading />
      </div>

      {/* ── Document tabs ── */}
      <div className="mt-4 flex gap-2 overflow-x-auto border-b px-6 pb-px">
        {docs.map((d: any) => {
          const active = d.id === activeId
          return (
            <Link
              key={d.id}
              href={`/pipeline?doc=${d.id}&tab=${tab}`}
              className={[
                'flex shrink-0 items-center gap-2 rounded-t-lg border border-b-0 px-4 py-2 text-sm transition-colors',
                active
                  ? 'border-border bg-background font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
              ].join(' ')}
            >
              <span
                className="h-[7px] w-[7px] shrink-0 rounded-full"
                style={{ background: STATUS_DOT[d.status] ?? '#8892a4' }}
              />
              {d.grd_number}
            </Link>
          )
        })}
      </div>

      {/* ── Pipeline ── */}
      <div className="px-6 pt-6">
        <PipelineTrack
          docNumber={grd.grd_number}
          pipeline={pipeline}
          meta={`อัปเดตล่าสุด ${formatDate(grd.updated_at)}`}
        />
      </div>

      {/* ── Section tabs ── */}
      <div className="flex items-center gap-4 px-6 pt-6">
        <div className="inline-flex rounded-lg bg-muted p-1">
          <SecTab href={tabHref('doc')} active={tab === 'doc'} icon={FileText} label="เอกสาร GRD" />
          <SecTab href={tabHref('approve')} active={tab === 'approve'} icon={PenLine} label="อนุมัติ" />
          <SecTab
            href={tabHref('activity')}
            active={tab === 'activity'}
            icon={History}
            label={`ประวัติ (${grd.approvals?.length ?? 0})`}
          />
        </div>
        <Badge variant={GRD_STATUS_VARIANT[grd.status as GRDStatus]}>
          {GRD_STATUS_LABEL[grd.status as GRDStatus] ?? grd.status}
        </Badge>
        <Link
          href={`/grd/${grd.id}`}
          className="ml-auto text-sm text-primary hover:underline"
        >
          เปิดหน้าเอกสารเต็ม →
        </Link>
      </div>

      <div className="p-6">
        {tab === 'doc' && <DocPanel grd={grd} payment={payment} />}
        {tab === 'approve' && (
          <ApprovePanel
            grd={grd}
            canSign={canSign}
            canApprove={canApprove}
          />
        )}
        {tab === 'activity' &&
          (grd.approvals?.length ? (
            <ApprovalTimeline approvals={grd.approvals} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                ยังไม่มีประวัติการดำเนินการ
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  )
}

function PageHeading() {
  return (
    <div className="flex items-center gap-3">
      <Workflow className="h-6 w-6 text-muted-foreground" />
      <div>
        <h1 className="text-2xl font-semibold">Pipeline</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ติดตามเอกสารตั้งแต่ PR จนถึงการชำระเงินในมุมมองเดียว
        </p>
      </div>
    </div>
  )
}

function SecTab({
  href,
  active,
  icon: Icon,
  label,
}: {
  href: string
  active: boolean
  icon: React.ElementType
  label: string
}) {
  return (
    <Link
      href={href}
      className={[
        'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
        active
          ? 'bg-background font-medium text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      ].join(' ')}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  )
}

function DocPanel({ grd, payment }: { grd: any; payment: any }) {
  const docs: any[] = Array.isArray(grd.supporting_docs) ? grd.supporting_docs : []

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ข้อมูลเอกสาร</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="ผู้ขาย" value={grd.vendor?.name ?? '—'} />
          <Row label="เลขผู้เสียภาษี" value={grd.vendor?.tax_id ?? '—'} />
          <Row label="อ้างอิง PO" value={grd.purchase_order?.po_number ?? '—'} />
          <Row label="อ้างอิง PR" value={grd.purchase_request?.pr_number ?? '—'} />
          <Row label="ลูกค้า" value={grd.customer?.code ?? '—'} />
          <Row label="วันที่รับงาน" value={formatDate(grd.date_of_completion)} />
          <Separator />
          <Row label="คำอธิบาย" value={grd.description} />
          {grd.remark && <Row label="หมายเหตุ" value={grd.remark} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">การเงิน</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="มูลค่าก่อน VAT" value={formatTHB(grd.amount)} />
          <Row label={`VAT ${grd.vat_rate}%`} value={formatTHB(grd.vat_amount)} />
          <Row label="มูลค่ารวม" value={formatTHB(grd.total_amount)} bold />
          <Separator />
          <Row label="เงื่อนไขชำระ" value={grd.purchase_order?.payment_terms ?? '—'} />
          <Row label="UV Number" value={payment?.uv_number ?? '—'} />
          <Row label="PV Number" value={payment?.pv_number ?? '—'} />
          <Row label="วันที่ชำระ" value={formatDate(payment?.paid_date)} />
          {grd.amount_in_words && (
            <p className="border-t pt-2 text-xs text-muted-foreground">
              {grd.amount_in_words}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Paperclip className="h-4 w-4" />
            เอกสารแนบ ({docs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {docs.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">ยังไม่มีเอกสารแนบ</p>
          ) : (
            <ul className="divide-y">
              {docs.map((d, i) => (
                <li key={i} className="flex items-center gap-3 py-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">
                    {d.name}
                  </a>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {Math.round((d.size ?? 0) / 1024)} KB
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ApprovePanel({
  grd,
  canSign,
  canApprove,
}: {
  grd: any
  canSign: boolean
  canApprove: boolean
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">สายอนุมัติ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <SignRow
            role="ผู้รับผิดชอบงาน"
            name={grd.receiver?.name}
            at={grd.signed_at}
            action="เซ็นรับงาน"
          />
          <Separator />
          <SignRow
            role="Team Lead"
            name={grd.team_lead?.name}
            at={grd.tl_approved_at}
            action="อนุมัติ"
          />
          <Separator />
          <SignRow
            role="Manager"
            name={grd.manager?.name}
            at={grd.manager_approved_at}
            action="อนุมัติ"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">การดำเนินการ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {!canSign && !canApprove && grd.status !== 'approved' && (
            <p className="text-muted-foreground">
              ขณะนี้ยังไม่ถึงคิวของคุณ — เอกสารอยู่ในขั้น{' '}
              <strong>{GRD_STATUS_LABEL[grd.status as GRDStatus] ?? grd.status}</strong>
            </p>
          )}
          {grd.status === 'approved' && (
            <p className="text-muted-foreground">อนุมัติครบสายงานแล้ว</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
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
        </CardContent>
      </Card>
    </div>
  )
}

function SignRow({
  role,
  name,
  at,
  action,
}: {
  role: string
  name?: string
  at?: string | null
  action: string
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs text-muted-foreground">{role}</p>
        <p className="font-medium">{name ?? '—'}</p>
      </div>
      <div className="text-right">
        {at ? (
          <>
            <p className="text-xs text-green-600 dark:text-green-400">{action}แล้ว</p>
            <p className="text-xs text-muted-foreground">{formatDate(at)}</p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">— ยังไม่{action} —</p>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={`text-right ${bold ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  )
}
