/**
 * Derives the six-stage document pipeline for a GRD:
 *
 *   PR ยื่นคำขอ → PR อนุมัติ → PO ออกแล้ว → GRD เซ็นรับงาน → อนุมัติครบ → ชำระเงิน
 *
 * A stage is `done` when its milestone timestamp exists, `rejected` when the
 * chain stopped there, `skipped` when it does not apply (e.g. a GRD created
 * from a PO that never had a PR), and the first outstanding stage is `active`.
 */

export type StageState = 'done' | 'active' | 'pending' | 'rejected' | 'skipped'

export interface PipelineStage {
  key: string
  step: number
  /** Two short lines shown under the node */
  label: [string, string]
  /** Longer description used for the tooltip / accessible label */
  title: string
  /** Wording used when the chain stopped at this stage */
  haltTitle?: string
  state: StageState
  /** Raw date string, or null when the milestone has not happened */
  date: string | null
  /** Text shown in place of a date while the stage is not done */
  placeholder: string
  icon: string
}

export interface PipelineSource {
  grd: {
    status: string
    signed_at?: string | null
    tl_approved_at?: string | null
    manager_approved_at?: string | null
    aging_status?: string | null
    created_at?: string | null
    date_of_completion?: string | null
  }
  pr?: {
    status?: string | null
    submitted_on?: string | null
    approved_date?: string | null
  } | null
  po?: { issued_date?: string | null } | null
  payment?: { status?: string | null; paid_date?: string | null } | null
}

export interface PipelineResult {
  stages: PipelineStage[]
  /** Headline chip describing where the document currently sits */
  chip: { label: string; tone: 'amber' | 'blue' | 'green' | 'red' }
  /** 0–100, how far along the track the document is */
  progress: number
}

type Draft = Omit<PipelineStage, 'state'> & { done: boolean; rejected: boolean; skipped: boolean }

export function buildGRDPipeline(src: PipelineSource): PipelineResult {
  const { grd, pr, po, payment } = src

  const hasPR = Boolean(pr)
  const prRejected = pr?.status === 'rejected'
  const prApproved = pr ? ['approved', 'po_created'].includes(pr.status ?? '') : false
  const grdRejected = grd.status === 'rejected'
  const grdApproved = grd.status === 'approved'
  const paid = payment?.status === 'paid' || grd.aging_status === 'done'

  const drafts: Draft[] = [
    {
      key: 'pr_submitted',
      step: 1,
      label: ['PR', 'ยื่นคำขอ'],
      title: 'ใบขอซื้อถูกยื่นเข้าระบบจาก Zoho Expense',
      icon: '◈',
      date: pr?.submitted_on ?? null,
      placeholder: hasPR ? 'รอยื่น' : 'ไม่มี PR',
      done: hasPR && Boolean(pr?.submitted_on),
      rejected: false,
      skipped: !hasPR,
    },
    {
      key: 'pr_approved',
      step: 2,
      label: ['PR', 'อนุมัติ'],
      title: 'ใบขอซื้อผ่านการอนุมัติครบสายงาน',
      haltTitle: 'ใบขอซื้อถูกตีกลับ ไม่ผ่านการอนุมัติ',
      icon: '✓',
      date: pr?.approved_date ?? null,
      placeholder: prRejected ? 'ไม่อนุมัติ' : 'รออนุมัติ',
      done: prApproved,
      rejected: prRejected,
      skipped: !hasPR,
    },
    {
      key: 'po_created',
      step: 3,
      label: ['PO', 'ออกแล้ว'],
      title: 'ใบสั่งซื้อถูกสร้างที่ PEAK และส่ง webhook เข้าระบบ',
      icon: '◉',
      date: po?.issued_date ?? null,
      placeholder: 'รอออก PO',
      done: Boolean(po?.issued_date),
      rejected: false,
      skipped: false,
    },
    {
      key: 'grd_signed',
      step: 4,
      label: ['GRD', 'เซ็นรับงาน'],
      title: 'ผู้รับผิดชอบกรอกวันที่รับงานและลงนามในใบรับสินค้า',
      icon: '🖊',
      date: grd.signed_at ?? null,
      placeholder: grd.status === 'draft' ? 'รอสร้าง' : 'รอกรอกข้อมูล',
      done: Boolean(grd.signed_at),
      rejected: false,
      skipped: false,
    },
    {
      key: 'grd_approved',
      step: 5,
      label: ['อนุมัติ', 'ครบสายงาน'],
      title: 'Team Lead และ Manager อนุมัติใบรับสินค้าครบแล้ว',
      haltTitle: 'ใบรับสินค้าถูกตีกลับ ไม่ผ่านการอนุมัติ',
      icon: '✦',
      date: grd.manager_approved_at ?? null,
      placeholder: grdRejected ? 'ไม่อนุมัติ' : 'รออนุมัติ',
      done: grdApproved,
      rejected: grdRejected,
      skipped: false,
    },
    {
      key: 'paid',
      step: 6,
      label: ['ชำระเงิน', 'เรียบร้อย'],
      title: 'Finance ออก UV/PV และชำระเงินให้ผู้ขายแล้ว',
      icon: '฿',
      date: payment?.paid_date ?? null,
      placeholder: 'รอชำระ',
      done: paid,
      rejected: false,
      skipped: false,
    },
  ]

  // First outstanding, non-skipped stage becomes `active` — unless the chain
  // was rejected, in which case nothing after the rejection is in progress.
  let halted = false
  let activeAssigned = false

  const stages: PipelineStage[] = drafts.map((d) => {
    let state: StageState

    if (d.rejected) {
      state = 'rejected'
      halted = true
    } else if (d.skipped) {
      state = 'skipped'
    } else if (d.done) {
      state = 'done'
    } else if (!halted && !activeAssigned) {
      state = 'active'
      activeAssigned = true
    } else {
      state = 'pending'
    }

    const { done: _d, rejected: _r, skipped: _s, ...rest } = d
    return { ...rest, state }
  })

  const doneCount = stages.filter((s) => s.state === 'done' || s.state === 'skipped').length
  const progress = Math.round((doneCount / stages.length) * 100)

  return { stages, chip: buildChip(stages), progress }
}

function buildChip(stages: PipelineStage[]): PipelineResult['chip'] {
  const rejected = stages.find((s) => s.state === 'rejected')
  if (rejected) {
    const why = rejected.haltTitle ?? rejected.title
    return { label: `หยุดที่ขั้น ${rejected.step} — ${why}`, tone: 'red' }
  }

  const active = stages.find((s) => s.state === 'active')
  if (!active) return { label: 'เสร็จสมบูรณ์ทุกขั้นตอน', tone: 'green' }

  const tone = active.step >= 5 ? 'blue' : 'amber'
  return { label: `ขั้นที่ ${active.step}/6 — ${active.title}`, tone }
}
