'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { EmployeeRole } from '@/types'

const ROLES: { value: EmployeeRole; label: string }[] = [
  { value: 'staff', label: 'Staff' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'manager', label: 'Manager' },
  { value: 'excom', label: 'ExCom' },
  { value: 'finance', label: 'Finance' },
  { value: 'admin', label: 'Admin' },
]

export function NewEmployeeDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    employee_code: '',
    name: '',
    email: '',
    role: 'staff' as EmployeeRole,
    department: '',
    zoho_user_id: '',
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/master/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          department: form.department || null,
          zoho_user_id: form.zoho_user_id || null,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error?.message ?? 'เพิ่มพนักงานไม่สำเร็จ')
        return
      }
      toast.success(`เพิ่ม "${form.name}" เรียบร้อย`)
      setOpen(false)
      setForm({ employee_code: '', name: '', email: '', role: 'staff', department: '', zoho_user_id: '' })
      router.refresh()
    } catch {
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* DialogTrigger renders its own <button> — style it directly
          rather than nesting another one inside it */}
      <DialogTrigger className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
        <Plus className="h-4 w-4" />
        เพิ่มพนักงาน
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>เพิ่มพนักงานใหม่</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>รหัสพนักงาน *</Label>
              <Input
                placeholder="EMP-001"
                value={form.employee_code}
                onChange={(e) => set('employee_code', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>ชื่อ-นามสกุล *</Label>
              <Input
                placeholder="สมชาย ใจดี"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input
              type="email"
              placeholder="somchai@example.com"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => set('role', v ?? 'staff')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>แผนก</Label>
              <Input
                placeholder="Finance"
                value={form.department}
                onChange={(e) => set('department', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Zoho User ID <span className="text-muted-foreground">(สำหรับ SSO)</span></Label>
            <Input
              placeholder="zoho-uid-xxxxxxx"
              value={form.zoho_user_id}
              onChange={(e) => set('zoho_user_id', e.target.value)}
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              เพิ่มพนักงาน
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
