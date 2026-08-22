import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { NewPRForm } from '@/components/pr/new-pr-form'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getApprovers() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('employees')
    .select('id, name, role, department')
    .in('role', ['team_lead', 'manager'])
    .eq('is_active', true)
    .order('name')
  return data ?? []
}

export default async function NewPRPage() {
  const session = await getSession()
  if (!session) return null

  const approvers = await getApprovers()
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <Link
          href="/pr"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับรายการใบขอซื้อ
        </Link>
        <h1 className="text-2xl font-semibold mt-3">สร้างใบขอซื้อ</h1>
        <p className="text-sm text-muted-foreground mt-1">
          สำหรับรายจ่ายที่ไม่ได้ผ่าน Zoho Expense เช่น ค่าใช้จ่ายประจำ เงินทดรองจ่าย
          หรือรายการที่ไม่ต้องออก PR — ระบบจะออกเลขที่ให้อัตโนมัติในรูปแบบ{' '}
          <code className="text-xs">PR-IN-69-0001</code>
        </p>
      </div>

      <NewPRForm approvers={approvers} today={today} />
    </div>
  )
}
