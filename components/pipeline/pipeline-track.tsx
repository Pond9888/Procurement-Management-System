import { formatDate } from '@/lib/utils'
import type { PipelineResult, PipelineStage } from '@/lib/pipeline'
import s from './pipeline-track.module.css'

const CHIP_CLASS = {
  amber: s.chipAmber,
  blue: s.chipBlue,
  green: s.chipGreen,
  red: s.chipRed,
} as const

const STATE_CLASS: Record<PipelineStage['state'], string> = {
  done: s.done,
  active: s.active,
  pending: s.pending,
  rejected: s.rejected,
  skipped: s.skipped,
}

const NODE_GLYPH: Record<PipelineStage['state'], (stage: PipelineStage) => string> = {
  done: () => '✓',
  active: (stage) => stage.icon,
  rejected: () => '✕',
  pending: () => '·',
  skipped: () => '–',
}

interface PipelineTrackProps {
  /** Document number shown as the card heading */
  docNumber: string
  pipeline: PipelineResult
  /** Right-hand meta line, e.g. last-updated timestamp */
  meta?: string
}

export function PipelineTrack({ docNumber, pipeline, meta }: PipelineTrackProps) {
  const { stages, chip } = pipeline

  return (
    <div className={s.card}>
      <div className={s.head}>
        <h2 className={s.title}>{docNumber}</h2>
        <div className={`${s.chip} ${CHIP_CLASS[chip.tone]}`}>{chip.label}</div>
        <div className={s.spacer} />
        {meta && <div className={s.meta}>{meta}</div>}
      </div>

      <div className={s.scroller}>
        <div className={s.track}>
          <Segments stages={stages} />

          {stages.map((stage) => (
            <div
              key={stage.key}
              className={`${s.node} ${STATE_CLASS[stage.state]}`}
              title={stage.title}
            >
              <div className={s.outer}>
                <div className={s.inner}>{NODE_GLYPH[stage.state](stage)}</div>
                <div className={s.step}>{stage.step}</div>
              </div>
              <div className={s.label}>
                {stage.label[0]}
                <br />
                {stage.label[1]}
              </div>
              <div className={s.date}>
                {stage.state === 'done' ? formatDate(stage.date) : stage.placeholder}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={s.legend}>
        <span className={s.legendItem}>
          <span className={`${s.swatch} ${s.swatchDone}`} /> เสร็จแล้ว
        </span>
        <span className={s.legendItem}>
          <span className={`${s.swatch} ${s.swatchActive}`} /> กำลังดำเนินการ
        </span>
        <span className={s.legendItem}>
          <span className={`${s.swatch} ${s.swatchPending}`} /> รอคิว
        </span>
        <span className={s.legendItem}>
          <span className={`${s.swatch} ${s.swatchRejected}`} /> ไม่อนุมัติ
        </span>
      </div>
    </div>
  )
}

/**
 * The connector sitting behind the nodes: one segment between each pair of
 * adjacent stages, plus a junction dot at every seam.
 */
function Segments({ stages }: { stages: PipelineStage[] }) {
  const parts: React.ReactNode[] = []

  for (let i = 0; i < stages.length - 1; i++) {
    const left = stages[i]
    const right = stages[i + 1]

    const settled = left.state === 'done' || left.state === 'skipped'
    const touchesSkipped = left.state === 'skipped' || right.state === 'skipped'

    let cls = s.seg
    if (left.state === 'rejected' || right.state === 'rejected') {
      // The chain stopped here — never shimmer into or out of a rejection
      cls = `${s.seg} ${s.segRejected}`
    } else if (touchesSkipped) {
      // Stage does not apply to this document — no "completed" green
      cls = `${s.seg} ${s.segSkipped}`
    } else if (settled && right.state === 'done') {
      cls = `${s.seg} ${s.segDone}`
    } else if (settled) {
      cls = `${s.seg} ${s.segActive}`
    }

    parts.push(<div key={`seg-${i}`} className={cls} />)

    if (i < stages.length - 2) {
      parts.push(
        <div
          key={`dot-${i}`}
          className={`${s.segDot} ${right.state === 'done' ? s.segDotDone : ''}`}
        />
      )
    }
  }

  return <div className={s.segments}>{parts}</div>
}
