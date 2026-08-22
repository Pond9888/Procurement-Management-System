'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatTHB } from '@/lib/utils'
import { Loader2, Send } from 'lucide-react'

const PR_TYPES = [
  { value: 'pr', label: 'PR — ขอซื้อตามปกติ' },
  { value: 'fixed', label: 'Fixed — ค่าใช้จ่ายประจำ' },
  { value: 'no_pr', label: 'No PR — ไม่ต้องออกใบขอซื้อ' },
  { value: 'advance', label: 'Advance — เงินทดรองจ่าย' },
]

const TYPE_GROUPS = ['PO', 'Fixed', 'Bill', 'Card', 'Advance']

const TYPE_EXPENSES = [
  'COGS', 'OPEX', 'Asset', 'Infra', 'Marketing', 'Taxes', 'Training', 'Expense',
]

const COMPANIES = [
  { value: 'vertex_corp', label: 'Vertex Corporation' },
  { value: 'vertex_infosec', label: 'Vertex Infosec' },
]

const EXCOM_THRESHOLD = 500_000

interface Approver {
  id: string
  name: string
  role: string
  department: string | null
}

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs ' +
  'outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

export function NewPRForm({
  approvers,
  today,
}: {
  approvers: Approver[]
  today: string
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    pr_type: 'pr',
    cf_company: 'vertex_corp',
    submitted_on: today,
    expected_date: '',
    submitted_to: '',
    item_category: '',
    reason: '',
    type_group: 'PO',
    type_expense: 'OPEX',
    quantity: '1',
    discount: '0',
    amount: '',
  })

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  const amountNum = Number(form.amount) || 0
  const needsExCom = amountNum > EXCOM_THRESHOLD

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/pr/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          expected_date: form.expected_date || null,
          submitted_to: form.submitted_to || null,
          quantity: Number(form.quantity) || 1,
          discount: Number(form.discount) || 0,
          amount: amountNum,
        }),
      })
      const json = await res.json()

      if (!json.success) {
        toast.error(json.error?.message ?? 'สร้างใบขอซื้อไม่สำเร็จ')
        return
      }

      toast.success(`สร้าง ${json.data.pr_number} แล้ว — กดเซ็นเพื่อส่งต่อ Team Lead`)
      router.push(`/pr/${json.data.id}`)
      router.refresh()
    } catch {
      toast.error('เชื่อมต่อไม่ได้ กรุณาลองใหม่')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* ── สิ่งที่ขอซื้อ ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">สิ่งที่ขอซื้อ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="เหตุผล / รายละเอียด" required htmlFor="reason">
              <Textarea
                id="reason"
                required
                rows={3}
                placeholder="เช่น จัดซื้อ Notebook ทดแทนเครื่องเดิมที่หมดอายุ 5 เครื่อง"
                value={form.reason}
                onChange={(e) => set('reason')(e.target.value)}
              />
            </Field>

            <Field label="หมวดหมู่" htmlFor="item_category">
              <Input
                id="item_category"
                placeholder="เช่น Hardware, Software License"
                value={form.item_category}
                onChange={(e) => set('item_category')(e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="ประเภท PR" required htmlFor="pr_type">
                <select
                  id="pr_type"
                  className={selectClass}
                  value={form.pr_type}
                  onChange={(e) => set('pr_type')(e.target.value)}
                >
                  {PR_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="บริษัท" required htmlFor="cf_company">
                <select
                  id="cf_company"
                  className={selectClass}
                  value={form.cf_company}
                  onChange={(e) => set('cf_company')(e.target.value)}
                >
                  {COMPANIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="กลุ่มรายจ่าย" required htmlFor="type_group">
                <select
                  id="type_group"
                  className={selectClass}
                  value={form.type_group}
                  onChange={(e) => set('type_group')(e.target.value)}
                >
                  {TYPE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>

              <Field label="ประเภทรายจ่าย" required htmlFor="type_expense">
                <select
                  id="type_expense"
                  className={selectClass}
                  value={form.type_expense}
                  onChange={(e) => set('type_expense')(e.target.value)}
                >
                  {TYPE_EXPENSES.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* ── จำนวนเงินและกำหนดการ ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">จำนวนเงินและกำหนดการ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="จำนวน" htmlFor="quantity">
                <Input
                  id="quantity" type="number" min="1" step="1"
                  value={form.quantity}
                  onChange={(e) => set('quantity')(e.target.value)}
                />
              </Field>
              <Field label="ส่วนลด (บาท)" htmlFor="discount">
                <Input
                  id="discount" type="number" min="0" step="0.01"
                  value={form.discount}
                  onChange={(e) => set('discount')(e.target.value)}
                />
              </Field>
            </div>

            <Field label="จำนวนเงินรวม (บาท)" required htmlFor="amount">
              <Input
                id="amount" type="number" min="0.01" step="0.01" required
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => set('amount')(e.target.value)}
              />
            </Field>

            {amountNum > 0 && (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  needsExCom
                    ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400'
                    : 'border-border bg-muted text-muted-foreground'
                }`}
              >
                <p className="font-medium">{formatTHB(amountNum)}</p>
                <p className="text-xs mt-0.5">
                  {needsExCom
                    ? 'เกิน 500,000 บาท — ต้องผ่าน ExCom เพิ่มอีกขั้นหลัง Manager'
                    : 'สายอนุมัติ: คุณเซ็น → Team Lead → Manager'}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="วันที่ยื่น" required htmlFor="submitted_on">
                <Input
                  id="submitted_on" type="date" required
                  value={form.submitted_on}
                  onChange={(e) => set('submitted_on')(e.target.value)}
                />
              </Field>
              <Field label="วันที่ต้องการ" htmlFor="expected_date">
                <Input
                  id="expected_date" type="date"
                  min={form.submitted_on}
                  value={form.expected_date}
                  onChange={(e) => set('expected_date')(e.target.value)}
                />
              </Field>
            </div>

            <Field label="ส่งถึง (Team Lead)" htmlFor="submitted_to">
              <select
                id="submitted_to"
                className={selectClass}
                value={form.submitted_to}
                onChange={(e) => set('submitted_to')(e.target.value)}
              >
                <option value="">— ไม่ระบุ —</option>
                {approvers.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}{a.department ? ` · ${a.department}` : ''}
                  </option>
                ))}
              </select>
            </Field>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          สร้างใบขอซื้อ
        </Button>
        <p className="text-sm text-muted-foreground">
          สร้างแล้วจะอยู่ในสถานะ <strong>รอเซ็น</strong> — ต้องกดเซ็นอีกครั้งจึงจะส่งต่อ Team Lead
        </p>
      </div>
    </form>
  )
}

function Field({
  label,
  required,
  htmlFor,
  children,
}: {
  label: string
  required?: boolean
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}
