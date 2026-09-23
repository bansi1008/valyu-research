import {
  Clock,
  Brain,
  Search,
  FileSearch,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Check,
  X,
} from 'lucide-react'
import type { Task, TaskStatus } from '../../types/task'
import { PIPELINE_STAGES, STAGE_INFO, getEffectiveStage, getStageIndex } from '../../types/task'
import { Spinner } from '../ui/Spinner'

interface PipelineStagesProps {
  task: Task
}

const ICONS: Record<TaskStatus, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  queued:          Clock,
  running:         Spinner as never,
  planning:        Brain,
  searching:       Search,
  evidence_review: FileSearch,
  synthesising:    Sparkles,
  validating:      ShieldCheck,
  completed:       CheckCircle,
  failed:          XCircle,
}

function parseDate(v: unknown): Date | null {
  if (!v) return null
  if (v instanceof Date) return v
  if (typeof v === 'string' || typeof v === 'number') return new Date(v)
  if (typeof v === 'object' && '_seconds' in (v as object)) {
    return new Date((v as { _seconds: number })._seconds * 1000)
  }
  return null
}

function elapsed(v: unknown): string {
  const d = parseDate(v)
  if (!d) return ''
  const secs = Math.floor((Date.now() - d.getTime()) / 1000)
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

export function PipelineStages({ task }: PipelineStagesProps) {
  const effective = getEffectiveStage(task)
  const activeIdx = getStageIndex(effective)
  const isFailed  = task.status === 'failed'

  return (
    <div className="max-w-2xl mx-auto w-full px-6 py-10 fade-up">

      <div
        className="mb-8 p-4 rounded-2xl border theme-surface"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-card)' }}
      >
        <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--text-3)' }}>
          Research Question
        </p>
        <p className="leading-relaxed text-[0.9375rem]" style={{ color: 'var(--text-1)' }}>
          {task.question}
        </p>
        <p className="text-[11px] mt-2" style={{ color: 'var(--text-3)' }}>
          Started {elapsed(task.createdAt)} ago
        </p>
      </div>

      <div className="mb-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm" style={{ color: 'var(--text-2)' }}>
            {isFailed ? 'Research failed' : (STAGE_INFO[effective]?.description ?? 'Processing…')}
          </span>
          <span
            className="text-sm font-bold tabular-nums"
            style={{ color: isFailed ? '#f87171' : '#38bdf8' }}
          >
            {task.progress}%
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${task.progress}%`,
              background: isFailed
                ? '#f87171'
                : 'linear-gradient(90deg, #0ea5e9 0%, #863bff 100%)',
              boxShadow: isFailed ? 'none' : '0 0 10px rgba(56,189,248,0.4)',
            }}
          />
        </div>
      </div>

      <div>
        {PIPELINE_STAGES.map((stage, idx) => {
          const info = STAGE_INFO[stage]
          const Icon = ICONS[stage]

          type S = 'done' | 'active' | 'failed' | 'pending'
          let s: S
          if (isFailed && idx === activeIdx) s = 'failed'
          else if (isFailed && idx < activeIdx) s = 'done'
          else if (idx < activeIdx) s = 'done'
          else if (idx === activeIdx) s = 'active'
          else s = 'pending'

          const isLast = idx === PIPELINE_STAGES.length - 1

          return (
            <div key={stage} className="flex items-stretch gap-4">
              <div className="flex flex-col items-center" style={{ width: 32 }}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500"
                  style={{
                    background: s === 'pending' ? 'var(--bg-card)' : info.bgColor,
                    border: `1.5px solid ${
                      s === 'pending'
                        ? 'var(--border)'
                        : s === 'failed'
                          ? '#f8717160'
                          : `${info.color}55`
                    }`,
                    boxShadow: s === 'active' ? `0 0 12px ${info.color}30` : 'none',
                  }}
                >
                  {s === 'done'    && <Check className="w-3.5 h-3.5" style={{ color: info.color }} />}
                  {s === 'active'  && <Spinner size="sm" color={info.color} />}
                  {s === 'failed'  && <X className="w-3.5 h-3.5 text-rose-400" />}
                  {s === 'pending' && <Icon className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />}
                </div>

                {!isLast && (
                  <div
                    className="w-px flex-1 my-1 transition-colors duration-500"
                    style={{
                      background: idx < activeIdx
                        ? `linear-gradient(to bottom, ${info.color}50, ${STAGE_INFO[PIPELINE_STAGES[idx + 1]].color}30)`
                        : 'var(--border)',
                      minHeight: 20,
                    }}
                  />
                )}
              </div>

              <div className="pb-5 pt-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[0.875rem] font-semibold transition-colors duration-300"
                    style={{
                      color: s === 'pending'
                        ? 'var(--text-4)'
                        : s === 'failed'
                          ? '#f87171'
                          : info.color,
                    }}
                  >
                    {info.label}
                  </span>
                  {s === 'active' && (
                    <span className="text-[11px] animate-pulse" style={{ color: 'var(--text-3)' }}>
                      in progress…
                    </span>
                  )}
                  {s === 'done' && (
                    <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>done</span>
                  )}
                </div>
                {s !== 'pending' && (
                  <p className="text-[12px] mt-0.5 leading-snug" style={{ color: 'var(--text-3)' }}>
                    {info.description}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {isFailed && task.error && (
        <div
          className="mt-4 p-4 rounded-xl border fade-up"
          style={{ background: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.20)' }}
        >
          <p className="text-sm font-semibold text-rose-400 mb-1">Error Details</p>
          <p className="text-sm font-mono leading-relaxed" style={{ color: 'rgba(248,113,113,0.75)' }}>
            {task.error}
          </p>
        </div>
      )}
    </div>
  )
}
