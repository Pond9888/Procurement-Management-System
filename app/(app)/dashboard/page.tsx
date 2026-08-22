import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, ClipboardCheck, Clock, CheckCircle } from 'lucide-react'

async function getStats(userId: string, role: string) {
  const supabase = createServiceClient()

  // PR stats
  let prQuery = supabase.from('purchase_requests').select('status', { count: 'exact', head: false })
  if (role === 'staff') prQuery = prQuery.eq('submitted_by', userId)

  const { data: prData } = await prQuery

  // GRD stats
  let grdQuery = supabase.from('goods_receipts').select('status', { count: 'exact', head: false })
  if (role === 'staff') grdQuery = grdQuery.eq('receiver_id', userId)
  else if (role === 'team_lead') grdQuery = grdQuery.eq('team_lead_id', userId)
  else if (role === 'manager') grdQuery = grdQuery.eq('manager_id', userId)

  const { data: grdData } = await grdQuery

  return { prData: prData ?? [], grdData: grdData ?? [] }
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) return null

  const { prData, grdData } = await getStats(session.id, session.role)

  const prPending = prData.filter((r: { status: string }) =>
    ['submitted', 'signed', 'pending_tl', 'pending_manager', 'pending_excom'].includes(r.status)
  ).length
  const prApproved = prData.filter((r: { status: string }) => r.status === 'approved').length

  const grdPending = grdData.filter((r: { status: string }) =>
    ['draft', 'pending_input', 'signed', 'pending_tl', 'pending_manager'].includes(r.status)
  ).length
  const grdApproved = grdData.filter((r: { status: string }) => r.status === 'approved').length

  // Pending approvals for team leads / managers
  let pendingApproval = 0
  if (role_needs_approval(session.role)) {
    const statusKey = session.role === 'team_lead' ? 'pending_tl' : 'pending_manager'
    const { count } = await createServiceClient()
      .from('goods_receipts')
      .select('*', { count: 'exact', head: true })
      .eq('status', statusKey)
    pendingApproval = count ?? 0
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">สวัสดี, {session.name}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          ภาพรวมของระบบจัดซื้อและการเงิน
        </p>
      </div>

      {/* Pending approvals banner */}
      {pendingApproval > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            มี <strong>{pendingApproval} รายการ</strong> รอการอนุมัติจากคุณ
          </p>
          <a href="/grd?filter=pending" className="ml-auto text-sm font-medium text-amber-700 dark:text-amber-400 hover:underline">
            ดูทั้งหมด →
          </a>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="PR ทั้งหมด"
          value={prData.length}
          sub={`${prPending} รอดำเนินการ`}
          icon={FileText}
          href="/pr"
        />
        <StatCard
          title="PR อนุมัติแล้ว"
          value={prApproved}
          sub="รายการที่ผ่านแล้ว"
          icon={CheckCircle}
          href="/pr?status=approved"
          positive
        />
        <StatCard
          title="GRD ทั้งหมด"
          value={grdData.length}
          sub={`${grdPending} รอดำเนินการ`}
          icon={ClipboardCheck}
          href="/grd"
        />
        <StatCard
          title="GRD อนุมัติแล้ว"
          value={grdApproved}
          sub="รายการที่ผ่านแล้ว"
          icon={CheckCircle}
          href="/grd?status=approved"
          positive
        />
      </div>
    </div>
  )
}

function role_needs_approval(role: string) {
  return role === 'team_lead' || role === 'manager' || role === 'excom'
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  href,
  positive,
}: {
  title: string
  value: number
  sub: string
  icon: React.ElementType
  href: string
  positive?: boolean
}) {
  return (
    <a href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <Icon className={`h-4 w-4 ${positive ? 'text-green-500' : 'text-muted-foreground'}`} />
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{sub}</p>
        </CardContent>
      </Card>
    </a>
  )
}
