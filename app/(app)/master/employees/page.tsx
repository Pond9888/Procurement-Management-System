import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmployeeRow } from '@/components/master/employee-row'
import { NewEmployeeDialog } from '@/components/master/new-employee-dialog'
import type { Employee } from '@/types'

export const dynamic = 'force-dynamic'

const ROLE_LABEL: Record<string, string> = {
  staff: 'Staff',
  team_lead: 'Team Lead',
  manager: 'Manager',
  excom: 'ExCom',
  finance: 'Finance',
  admin: 'Admin',
}

async function getEmployees(): Promise<Employee[]> {
  const supabase = createServiceClient()
  const { data } = await supabase.from('employees').select('*').order('name')
  return (data ?? []) as Employee[]
}

export default async function MasterEmployeesPage() {
  const session = await getSession()
  if (!session) return null
  if (session.role !== 'admin') redirect('/dashboard')

  const employees = await getEmployees()
  const activeCount = employees.filter((e) => e.is_active).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">จัดการพนักงาน</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ทั้งหมด {employees.length} คน · ใช้งานอยู่ {activeCount} คน
          </p>
        </div>
        <NewEmployeeDialog />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">รายชื่อพนักงานทั้งหมด</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">ชื่อ</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">รหัส</th>
                  <th className="text-left px-4 py-3 font-medium">แผนก</th>
                  <th className="text-center px-4 py-3 font-medium">Role</th>
                  <th className="text-center px-4 py-3 font-medium">สถานะ</th>
                  <th className="text-center px-4 py-3 font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      ยังไม่มีข้อมูลพนักงาน
                    </td>
                  </tr>
                )}
                {employees.map((emp) => (
                  <EmployeeRow key={emp.id} employee={emp} roleLabel={ROLE_LABEL} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
