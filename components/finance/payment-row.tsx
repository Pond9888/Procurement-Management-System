'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Pencil, Check, X } from 'lucide-react'
import { formatTHB, formatDate } from '@/lib/utils'

const STATUS_LABEL: Record<string, string> = {
  pending: 'รอชำระ',
  invoiced: 'Invoice แล้ว',
  paid: 'ชำระแล้ว',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  pending: 'secondary',
  invoiced: 'outline',
  paid: 'default',
}

const STATUS_NEXT: Record<string, string> = {
  pending: 'invoiced',
  invoiced: 'paid',
  paid: 'paid',
}

interface Payment {
  id: string
  status: string
  uv_number: string | null
  pv_number: string | null
  planned_date: string | null
  paid_date: string | null
  amount: number | null
  vendor?: { name: string }
  grd?: { id: string; grd_number: string; total_amount: number }
  po?: { po_number: string }
}

export function PaymentRow({ payment }: { payment: Payment }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  const [uvNumber, setUvNumber] = useState(payment.uv_number ?? '')
  const [pvNumber, setPvNumber] = useState(payment.pv_number ?? '')
  const [plannedDate, setPlannedDate] = useState(payment.planned_date ?? '')
  const [paidDate, setPaidDate] = useState(payment.paid_date ?? '')

  async function handleSave() {
    setLoading(true)
    try {
      const updates: Record<string, unknown> = {
        uv_number: uvNumber || null,
        pv_number: pvNumber || null,
        planned_date: plannedDate || null,
        paid_date: paidDate || null,
      }
      // Auto-advance status
      if (paidDate && payment.status !== 'paid') updates.status = 'paid'
      else if (uvNumber && payment.status === 'pending') updates.status = 'invoiced'

      const res = await fetch(`/api/payments/${payment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? 'บันทึกไม่สำเร็จ')
      } else {
        toast.success('อัปเดต Payment เรียบร้อยแล้ว')
        setEditing(false)
        router.refresh()
      }
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  function handleCancel() {
    setUvNumber(payment.uv_number ?? '')
    setPvNumber(payment.pv_number ?? '')
    setPlannedDate(payment.planned_date ?? '')
    setPaidDate(payment.paid_date ?? '')
    setEditing(false)
  }

  async function handleAdvanceStatus() {
    const next = STATUS_NEXT[payment.status]
    if (next === payment.status) return
    setLoading(true)
    try {
      const res = await fetch(`/api/payments/${payment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? 'ไม่สำเร็จ')
      } else {
        toast.success(`เปลี่ยนสถานะเป็น "${STATUS_LABEL[next]}"`)
        router.refresh()
      }
    } catch {
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <tr className={`hover:bg-muted/20 ${editing ? 'bg-blue-50/50 dark:bg-blue-500/10' : ''}`}>
      {/* GRD number */}
      <td className="px-4 py-2 font-medium">
        {payment.grd?.id ? (
          <a href={`/grd/${payment.grd.id}`} className="hover:underline">
            {payment.grd.grd_number}
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>

      {/* Vendor */}
      <td className="px-4 py-2 text-muted-foreground max-w-[140px] truncate">
        {payment.vendor?.name ?? '—'}
      </td>

      {/* UV Number */}
      <td className="px-4 py-2">
        {editing ? (
          <Input
            value={uvNumber}
            onChange={(e) => setUvNumber(e.target.value)}
            placeholder="UV-xxxxxxxxx"
            className="h-7 text-xs w-32"
          />
        ) : (
          <span className="font-mono text-xs">{payment.uv_number ?? '—'}</span>
        )}
      </td>

      {/* PV Number */}
      <td className="px-4 py-2">
        {editing ? (
          <Input
            value={pvNumber}
            onChange={(e) => setPvNumber(e.target.value)}
            placeholder="PV-xxxxxxxxx"
            className="h-7 text-xs w-32"
          />
        ) : (
          <span className="font-mono text-xs">{payment.pv_number ?? '—'}</span>
        )}
      </td>

      {/* Planned date */}
      <td className="px-4 py-2 whitespace-nowrap">
        {editing ? (
          <Input
            type="date"
            value={plannedDate}
            onChange={(e) => setPlannedDate(e.target.value)}
            className="h-7 text-xs w-36"
          />
        ) : (
          formatDate(payment.planned_date)
        )}
      </td>

      {/* Paid date */}
      <td className="px-4 py-2 whitespace-nowrap">
        {editing ? (
          <Input
            type="date"
            value={paidDate}
            onChange={(e) => setPaidDate(e.target.value)}
            className="h-7 text-xs w-36"
          />
        ) : (
          <span className={payment.paid_date ? 'text-green-700 dark:text-green-400 font-medium' : ''}>
            {formatDate(payment.paid_date)}
          </span>
        )}
      </td>

      {/* Amount */}
      <td className="px-4 py-2 text-right font-medium whitespace-nowrap">
        {formatTHB(payment.amount ?? payment.grd?.total_amount ?? 0)}
      </td>

      {/* Status badge + advance button */}
      <td className="px-4 py-2 text-center">
        <div className="flex flex-col items-center gap-1">
          <Badge variant={STATUS_VARIANT[payment.status] ?? 'secondary'}>
            {STATUS_LABEL[payment.status] ?? payment.status}
          </Badge>
          {payment.status !== 'paid' && !editing && (
            <button
              onClick={handleAdvanceStatus}
              disabled={loading}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                `→ ${STATUS_LABEL[STATUS_NEXT[payment.status]]}`
              )}
            </button>
          )}
        </div>
      </td>

      {/* Edit / Save / Cancel */}
      <td className="px-4 py-2">
        {editing ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              disabled={loading}
              className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-500/15 text-green-600 dark:text-green-400"
              title="บันทึก"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-500/15 text-red-500"
              title="ยกเลิก"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="แก้ไข"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </td>
    </tr>
  )
}
