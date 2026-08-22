'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Save } from 'lucide-react'

interface Employee {
  id: string
  name: string
  role: string
}

interface GRDInputFormProps {
  grdId: string
  defaultValues: {
    date_of_completion?: string | null
    remark?: string | null
    team_lead_id?: string | null
    manager_id?: string | null
  }
  teamLeads: Employee[]
  managers: Employee[]
}

export function GRDInputForm({
  grdId,
  defaultValues,
  teamLeads,
  managers,
}: GRDInputFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [date, setDate] = useState(defaultValues.date_of_completion ?? '')
  const [remark, setRemark] = useState(defaultValues.remark ?? '')
  const [teamLeadId, setTeamLeadId] = useState(defaultValues.team_lead_id ?? '')
  const [managerId, setManagerId] = useState(defaultValues.manager_id ?? '')

  async function handleSave() {
    if (!date) {
      toast.error('กรุณาระบุวันที่รับงาน')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/grd/${grdId}/input`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_of_completion: date,
          remark: remark || undefined,
          team_lead_id: teamLeadId || undefined,
          manager_id: managerId || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? 'บันทึกไม่สำเร็จ')
      } else {
        toast.success('บันทึกข้อมูลเรียบร้อยแล้ว')
        router.refresh()
      }
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">วันที่รับงาน/บริการ *</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="team-lead">Team Lead *</Label>
          <Select value={teamLeadId} onValueChange={(v) => setTeamLeadId(v ?? '')}>
            <SelectTrigger id="team-lead">
              <SelectValue placeholder="เลือก Team Lead" />
            </SelectTrigger>
            <SelectContent>
              {teamLeads.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="manager">Manager</Label>
          <Select value={managerId} onValueChange={(v) => setManagerId(v ?? '')}>
            <SelectTrigger id="manager">
              <SelectValue placeholder="เลือก Manager" />
            </SelectTrigger>
            <SelectContent>
              {managers.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="remark">หมายเหตุ</Label>
        <Textarea
          id="remark"
          placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          rows={3}
        />
      </div>

      <Button onClick={handleSave} disabled={loading}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        บันทึก
      </Button>
    </div>
  )
}
