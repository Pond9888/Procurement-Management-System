'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Employee, EmployeeRole } from '@/types'

const ROLES: EmployeeRole[] = ['staff', 'team_lead', 'manager', 'excom', 'finance', 'admin']

interface EmployeeRowProps {
  employee: Employee
  roleLabel: Record<string, string>
}

export function EmployeeRow({ employee, roleLabel }: EmployeeRowProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)

  const [name, setName] = useState(employee.name)
  const [dept, setDept] = useState(employee.department ?? '')
  const [role, setRole] = useState<EmployeeRole>(employee.role)

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/master/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, department: dept || null, role }),
      })
      const json = await res.json()
      if (!json.success) { toast.error(json.error?.message ?? 'บันทึกไม่สำเร็จ'); return }
      toast.success('บันทึกเรียบร้อย')
      setEditing(false)
      router.refresh()
    } catch {
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    setName(employee.name)
    setDept(employee.department ?? '')
    setRole(employee.role)
    setEditing(false)
  }

  async function toggleActive() {
    setToggling(true)
    try {
      const res = await fetch(`/api/master/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !employee.is_active }),
      })
      const json = await res.json()
      if (!json.success) { toast.error(json.error?.message ?? 'ไม่สำเร็จ'); return }
      toast.success(employee.is_active ? 'ปิดการใช้งานแล้ว' : 'เปิดการใช้งานแล้ว')
      router.refresh()
    } catch {
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setToggling(false)
    }
  }

  return (
    <tr className={`hover:bg-muted/30 ${!employee.is_active ? 'opacity-50' : ''}`}>
      <td className="px-4 py-3">
        {editing ? (
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm w-40" />
        ) : (
          <span className="font-medium">{employee.name}</span>
        )}
      </td>
      <td className="px-4 py-3 text-muted-foreground text-xs">{employee.email}</td>
      <td className="px-4 py-3 font-mono text-xs">{employee.employee_code}</td>
      <td className="px-4 py-3">
        {editing ? (
          <Input value={dept} onChange={(e) => setDept(e.target.value)} className="h-8 text-sm w-32" placeholder="แผนก" />
        ) : (
          <span className="text-muted-foreground">{employee.department ?? '—'}</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        {editing ? (
          <Select value={role} onValueChange={(v) => setRole(v as EmployeeRole)}>
            <SelectTrigger className="h-8 text-sm w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>{roleLabel[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            employee.role === 'admin' ? 'bg-purple-100 text-purple-700' :
            employee.role === 'manager' ? 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400' :
            employee.role === 'team_lead' ? 'bg-sky-100 text-sky-700' :
            employee.role === 'finance' ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400' :
            employee.role === 'excom' ? 'bg-orange-100 text-orange-700' :
            'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
          }`}>
            {roleLabel[employee.role] ?? employee.role}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          employee.is_active ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400'
        }`}>
          {employee.is_active ? 'ใช้งาน' : 'ปิดการใช้งาน'}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          {editing ? (
            <>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 dark:text-green-400" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={cancel}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={`h-7 text-xs px-2 ${employee.is_active ? 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-400' : 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-400'}`}
                onClick={toggleActive}
                disabled={toggling}
              >
                {toggling ? <Loader2 className="h-3 w-3 animate-spin" /> : employee.is_active ? 'ปิด' : 'เปิด'}
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}
