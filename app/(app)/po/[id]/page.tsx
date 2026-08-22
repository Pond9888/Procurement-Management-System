import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
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
import type { GRDStatus, PRStatus } from '@/types'

export const dynamic = 'force-dynamic'

const ALLOWED = ['team_lead', 'manager', 'excom', 'finance', 'admin']

async function getPO(id: string) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(
      `*, vendor:vendors(*), customer:customers(code, name_th),
       purchase_request:purchase_requests(id, pr_number, status, amount, cf_company, reason),
       issuer:employees!issued_by(id, name, department),
       goods_receipt:goods_receipts(id, grd_number, status, total_amount, date_of_completion),
       payment:payments(id, uv_number, pv_number, status, paid_date)`
    )
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as any
}

export default async function PODetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) return null
  if (!ALLOWED.includes(session.role)) redirect('/dashboard')

  const { id } = await params
  const po = await getPO(id)
  if (!po) notFound()

  const grds: any[] = Array.isArray(po.goods_receipt)
    ? po.goods_receipt
    : po.goods_receipt
      ? [po.goods_receipt]
      : []
  const payments: any[] = Array.isArray(po.payment)
    ? po.payment
    : po.payment
      ? [po.payment]
      : []

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{po.po_number}</h1>
            {po.peak_po_id && <Badge variant="outline">PEAK</Badge>}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {po.vendor?.name ?? '—'} · ออกเมื่อ {formatDate(po.issued_date)}
          </p>
        </div>
        <Link href="/po" className="shrink-0 text-sm text-primary hover:underline">
          ← กลับรายการ PO
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Order details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">รายละเอียดใบสั่งซื้อ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="รายละเอียด" value={po.description} />
            <Row label="หมวดหมู่" value={po.product_category ?? '—'} />
            <Row label="จำนวน" value={String(po.quantity ?? '—')} />
            <Row
              label="ราคาต่อหน่วย"
              value={po.unit_price != null ? formatTHB(po.unit_price) : '—'}
            />
            <Separator />
            <Row label="มูลค่าก่อน VAT" value={formatTHB(po.amount_excl_vat)} />
            <Row label={`VAT ${po.vat_rate}%`} value={formatTHB(po.vat_amount)} />
            <Row label="มูลค่ารวม" value={formatTHB(po.total_amount)} bold />
            <Separator />
            <Row label="เงื่อนไขชำระ" value={po.payment_terms ?? '—'} />
            <Row label="ผู้ออก PO" value={po.issuer?.name ?? '—'} />
          </CardContent>
        </Card>

        {/* Vendor + references */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ผู้ขายและเอกสารอ้างอิง</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="ผู้ขาย" value={po.vendor?.name ?? '—'} />
            <Row label="รหัสผู้ขาย" value={po.vendor?.vendor_code ?? '—'} />
            <Row label="เลขผู้เสียภาษี" value={po.vendor?.tax_id ?? '—'} />
            <Row label="ติดต่อ" value={po.vendor?.phone ?? '—'} />
            <Separator />
            <Row label="ลูกค้า" value={po.customer?.code ?? '—'} />
            <div className="flex justify-between gap-4">
              <span className="shrink-0 text-muted-foreground">อ้างอิง PR</span>
              <span className="text-right">
                {po.purchase_request ? (
                  <Link
                    href={`/pr/${po.purchase_request.id}`}
                    className="text-primary hover:underline"
                  >
                    {po.purchase_request.pr_number ?? 'ไม่มีเลขที่'}
                  </Link>
                ) : (
                  '—'
                )}
              </span>
            </div>
            {po.purchase_request && (
              <div className="flex justify-between gap-4">
                <span className="shrink-0 text-muted-foreground">สถานะ PR</span>
                <Badge variant={PR_STATUS_VARIANT[po.purchase_request.status as PRStatus]}>
                  {PR_STATUS_LABEL[po.purchase_request.status as PRStatus] ??
                    po.purchase_request.status}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Linked GRDs */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">ใบรับสินค้าที่เกี่ยวข้อง ({grds.length})</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {grds.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">
                ยังไม่มีใบรับสินค้าสำหรับ PO นี้
              </p>
            ) : (
              <ul className="divide-y">
                {grds.map((g) => (
                  <li key={g.id} className="flex items-center gap-4 py-3">
                    <Link href={`/grd/${g.id}`} className="font-medium hover:underline">
                      {g.grd_number}
                    </Link>
                    <Badge variant={GRD_STATUS_VARIANT[g.status as GRDStatus]}>
                      {GRD_STATUS_LABEL[g.status as GRDStatus] ?? g.status}
                    </Badge>
                    <span className="text-muted-foreground">
                      รับงาน {formatDate(g.date_of_completion)}
                    </span>
                    <span className="ml-auto font-medium">{formatTHB(g.total_amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Payments */}
        {payments.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">การชำระเงิน ({payments.length})</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <ul className="divide-y">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center gap-4 py-3">
                    <span className="font-mono text-xs">{p.uv_number ?? '—'}</span>
                    <span className="font-mono text-xs">{p.pv_number ?? '—'}</span>
                    <Badge variant={p.status === 'paid' ? 'default' : 'secondary'}>
                      {p.status === 'paid'
                        ? 'ชำระแล้ว'
                        : p.status === 'invoiced'
                          ? 'รับ Invoice แล้ว'
                          : 'รอชำระ'}
                    </Badge>
                    <span className="ml-auto text-muted-foreground">
                      {p.paid_date ? formatDate(p.paid_date) : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
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
