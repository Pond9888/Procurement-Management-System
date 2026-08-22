import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { formatTHB, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/** Roles that may see purchase orders — mirrors the sidebar entry */
const ALLOWED = ['team_lead', 'manager', 'excom', 'finance', 'admin']

async function getPOs(companyFilter: string | null) {
  const supabase = createServiceClient()

  let query = supabase
    .from('purchase_orders')
    .select(
      `id, po_number, issued_date, description, product_category,
       amount_excl_vat, vat_rate, vat_amount, total_amount, payment_terms,
       vendor:vendors(name),
       customer:customers(code),
       purchase_request:purchase_requests(pr_number, cf_company),
       goods_receipt:goods_receipts(id, grd_number, status)`
    )
    .order('issued_date', { ascending: false })
    .limit(100)

  const { data, error } = await query
  if (error) return []

  const rows = data ?? []
  if (!companyFilter) return rows

  return rows.filter((po: any) => po.purchase_request?.cf_company === companyFilter)
}

export default async function POListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const session = await getSession()
  if (!session) return null
  if (!ALLOWED.includes(session.role)) redirect('/dashboard')

  const params = await searchParams
  const companyFilter = params.company ?? null

  const pos = await getPOs(companyFilter)

  const totalValue = pos.reduce((sum: number, po: any) => sum + (po.total_amount ?? 0), 0)
  const withoutGRD = pos.filter((po: any) => !firstGRD(po)).length

  const COMPANY_TABS: Array<{ label: string; value: string | null }> = [
    { label: 'ทั้งหมด', value: null },
    { label: 'Vertex Corp', value: 'vertex_corp' },
    { label: 'Vertex Infosec', value: 'vertex_infosec' },
  ]

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">ใบสั่งซื้อ (PO)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pos.length} รายการ · มูลค่ารวม {formatTHB(totalValue)}
          </p>
        </div>
        {withoutGRD > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
            {withoutGRD} รายการยังไม่มีใบรับสินค้า
          </div>
        )}
      </div>

      {/* Company filter */}
      <div className="flex flex-wrap gap-2">
        {COMPANY_TABS.map((tab) => {
          const href = tab.value ? `/po?company=${tab.value}` : '/po'
          const active = companyFilter === tab.value
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
                <th className="text-left px-4 py-3 font-medium">PO Number</th>
                <th className="text-left px-4 py-3 font-medium">Vendor</th>
                <th className="text-left px-4 py-3 font-medium">รายละเอียด</th>
                <th className="text-left px-4 py-3 font-medium">อ้างอิง PR</th>
                <th className="text-left px-4 py-3 font-medium">วันที่ออก</th>
                <th className="text-right px-4 py-3 font-medium">มูลค่ารวม</th>
                <th className="text-center px-4 py-3 font-medium">GRD</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pos.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    ยังไม่มีใบสั่งซื้อ
                  </td>
                </tr>
              )}
              {pos.map((po: any) => {
                const grd = firstGRD(po)
                return (
                  <tr key={po.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/po/${po.id}`} className="hover:underline">
                        {po.po_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate" title={po.vendor?.name}>
                      {po.vendor?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 max-w-[260px] truncate" title={po.description}>
                      {po.description}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {po.purchase_request?.pr_number ?? '—'}
                    </td>
                    <td className="px-4 py-3">{formatDate(po.issued_date)}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatTHB(po.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {grd ? (
                        <Link href={`/grd/${grd.id}`} className="hover:underline">
                          <Badge variant="secondary">{grd.grd_number}</Badge>
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">ยังไม่มี</span>
                      )}
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

/** A PO may have several GRDs (partial deliveries) — show the first */
function firstGRD(po: any) {
  if (Array.isArray(po.goods_receipt)) return po.goods_receipt[0] ?? null
  return po.goods_receipt ?? null
}
