import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatTHB, formatDate } from '@/lib/utils'
import { PaymentRow } from '@/components/finance/payment-row'

export const dynamic = 'force-dynamic'

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'รอชำระ',
  invoiced: 'รับ Invoice แล้ว',
  paid: 'ชำระแล้ว',
}

const PAYMENT_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  pending: 'secondary',
  invoiced: 'outline',
  paid: 'default',
}

async function getPayments(statusFilter: string | null) {
  const supabase = createServiceClient()
  let query = supabase
    .from('payments')
    .select(
      `*, vendor:vendors(name),
       grd:goods_receipts(id, grd_number, total_amount, status),
       po:purchase_orders(po_number, payment_terms)`
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (statusFilter) query = query.eq('status', statusFilter)
  const { data } = await query
  return data ?? []
}

async function getApprovedUnpaidGRDs() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('goods_receipts')
    .select(
      `id, grd_number, total_amount, vendor:vendors(name),
       po:purchase_orders(po_number)`
    )
    .eq('status', 'approved')
    .eq('aging_status', 'pending')
    .is('id', null) // only those without payment — use NOT IN subquery via client-side filter
    .order('created_at', { ascending: false })
    .limit(100)

  // Simpler approach: fetch all approved GRDs + their payments, filter client-side
  const { data: approvedGRDs } = await supabase
    .from('goods_receipts')
    .select(`id, grd_number, total_amount, vendor:vendors(name), po:purchase_orders(po_number),
             payment:payments(id)`)
    .eq('status', 'approved')
    .eq('aging_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50)

  return (approvedGRDs ?? []).filter(
    (g: any) => !g.payment || (Array.isArray(g.payment) && g.payment.length === 0)
  )
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const session = await getSession()
  if (!session) return null
  if (!['finance', 'admin'].includes(session.role)) redirect('/dashboard')

  const params = await searchParams
  const statusFilter = params.status ?? null

  const [payments, unpaidGRDs] = await Promise.all([
    getPayments(statusFilter),
    getApprovedUnpaidGRDs(),
  ])

  const STATUS_TABS = [
    { label: 'ทั้งหมด', value: null },
    { label: 'รอชำระ', value: 'pending' },
    { label: 'Invoice แล้ว', value: 'invoiced' },
    { label: 'ชำระแล้ว', value: 'paid' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">การชำระเงิน</h1>
        <p className="text-sm text-muted-foreground mt-1">จัดการ UV/PV และติดตามการชำระเงิน</p>
      </div>

      {/* GRDs ready for payment (no payment record yet) */}
      {unpaidGRDs.length > 0 && (
        <Card className="overflow-hidden border-blue-200 dark:border-blue-500/30">
          <div className="bg-blue-50 dark:bg-blue-500/10 px-4 py-3 border-b border-blue-200 dark:border-blue-500/30">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              GRD ที่ approved แล้ว — ยังไม่มี Payment record ({unpaidGRDs.length} รายการ)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">GRD</th>
                  <th className="text-left px-4 py-2 font-medium">Vendor</th>
                  <th className="text-left px-4 py-2 font-medium">PO</th>
                  <th className="text-right px-4 py-2 font-medium">มูลค่า</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {unpaidGRDs.map((g: any) => (
                  <tr key={g.id}>
                    <td className="px-4 py-2 font-medium">{g.grd_number}</td>
                    <td className="px-4 py-2 text-muted-foreground">{g.vendor?.name ?? '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs">{g.po?.po_number ?? '—'}</td>
                    <td className="px-4 py-2 text-right">{formatTHB(g.total_amount)}</td>
                    <td className="px-4 py-2 text-right">
                      <CreatePaymentButton grdId={g.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((tab) => {
          const href = tab.value ? `/payments?status=${tab.value}` : '/payments'
          const active = statusFilter === tab.value
          return (
            <a
              key={tab.label}
              href={href}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
            </a>
          )
        })}
      </div>

      {/* Payment table (inline editable) */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">GRD</th>
                <th className="text-left px-4 py-3 font-medium">Vendor</th>
                <th className="text-left px-4 py-3 font-medium">UV Number</th>
                <th className="text-left px-4 py-3 font-medium">PV Number</th>
                <th className="text-left px-4 py-3 font-medium">วันกำหนดชำระ</th>
                <th className="text-left px-4 py-3 font-medium">วันชำระจริง</th>
                <th className="text-right px-4 py-3 font-medium">มูลค่า</th>
                <th className="text-center px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-muted-foreground">
                    ไม่พบรายการ
                  </td>
                </tr>
              )}
              {payments.map((p: any) => (
                <PaymentRow key={p.id} payment={p} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// Small server-rendered button triggers client action
function CreatePaymentButton({ grdId }: { grdId: string }) {
  return (
    <form action={`/api/payments`} method="POST">
      <input type="hidden" name="grd_id" value={grdId} />
      <button
        type="submit"
        className="text-xs px-3 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90"
      >
        สร้าง Payment
      </button>
    </form>
  )
}
