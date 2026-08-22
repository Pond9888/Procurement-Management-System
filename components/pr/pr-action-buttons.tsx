'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle, XCircle, PenLine, Loader2 } from 'lucide-react'
import type { PRStatus } from '@/types'

interface PRActionButtonsProps {
  prId: string
  canSign: boolean
  canApprove: boolean
  currentStatus: PRStatus
}

export function PRActionButtons({
  prId,
  canSign,
  canApprove,
  currentStatus,
}: PRActionButtonsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectComment, setRejectComment] = useState('')

  async function handleSign() {
    setLoading('sign')
    try {
      const res = await fetch(`/api/pr/${prId}/sign`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? 'เซ็นไม่สำเร็จ')
      } else {
        toast.success('เซ็น PR เรียบร้อยแล้ว — รอ Team Lead อนุมัติ')
        router.refresh()
      }
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(null)
    }
  }

  async function handleApprove() {
    setLoading('approve')
    try {
      const res = await fetch(`/api/pr/${prId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approved' }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? 'อนุมัติไม่สำเร็จ')
      } else {
        toast.success('อนุมัติ PR เรียบร้อยแล้ว')
        router.refresh()
      }
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(null)
    }
  }

  async function handleReject() {
    if (!rejectComment.trim()) {
      toast.error('กรุณาระบุเหตุผลในการไม่อนุมัติ')
      return
    }
    setLoading('reject')
    try {
      const res = await fetch(`/api/pr/${prId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rejected', comment: rejectComment }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? 'ไม่สำเร็จ')
      } else {
        toast.success('ไม่อนุมัติ PR แล้ว')
        setRejectOpen(false)
        router.refresh()
      }
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(null)
    }
  }

  if (!canSign && !canApprove) return null

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* Staff: Sign button */}
      {canSign && (
        <Button onClick={handleSign} disabled={loading === 'sign'}>
          {loading === 'sign' ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <PenLine className="h-4 w-4 mr-2" />
          )}
          เซ็น PR
        </Button>
      )}

      {/* Approver: Approve + Reject */}
      {canApprove && (
        <>
          <Button onClick={handleApprove} disabled={!!loading}>
            {loading === 'approve' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            อนุมัติ
          </Button>

          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            {/* DialogTrigger renders its own <button> — style it directly
                rather than nesting another one inside it */}
            <DialogTrigger
              className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              disabled={!!loading}
            >
              <XCircle className="h-4 w-4" />
              ไม่อนุมัติ
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>ไม่อนุมัติ PR</DialogTitle>
                <DialogDescription>
                  กรุณาระบุเหตุผล — Staff จะได้รับการแจ้งเตือน
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="reject-comment">เหตุผล *</Label>
                <Textarea
                  id="reject-comment"
                  placeholder="เช่น ข้อมูลไม่ครบถ้วน / งบประมาณเกิน"
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  rows={4}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectOpen(false)}>
                  ยกเลิก
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={loading === 'reject'}
                >
                  {loading === 'reject' && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  ยืนยันไม่อนุมัติ
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
