import { Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react'
import type { TaskHistoryItem, TaskStatus } from '../../types/task'
import { STAGE_INFO } from '../../types/task'
import { cn } from '../../utils/cn'

interface TaskCardProps {
  task: TaskHistoryItem
  isSelected: boolean
  onClick: () => void
}

function timeAgo(v: unknown): string {
  try {
    let date: Date
    if (typeof v === 'object' && v !== null && '_seconds' in v) {
      date = new Date((v as { _seconds: number })._seconds * 1000)
    } else {
      date = new Date(v as string)
    }
    const diff = Date.now() - date.getTime()
    const m = Math.floor(diff / 60_000)
    const h = Math.floor(diff / 3_600_000)
    const d = Math.floor(diff / 86_400_000)
    if (m < 1)  return 'just now'
    if (m < 60) return `${m}m ago`
    if (h < 24) return `${h}h ago`
    return `${d}d ago`
  } catch { return '' }
}

function StatusIcon({ status }: { status: TaskStatus }) {
  const info    = STAGE_INFO[status]
  const isSpinning = status !== 'completed' && status !== 'failed' && status !== 'queued'
  if (status === 'completed') return <CheckCircle className="w-4 h-4" style={{ color: info.color }} />
  if (status === 'failed')    return <XCircle     className="w-4 h-4" style={{ color: info.color }} />
  if (status === 'queued')    return <Clock       className="w-4 h-4" style={{ color: info.color }} />
  return <Loader className={cn('w-4 h-4', isSpinning && 'animate-spin')} style={{ color: info.color }} />
}

export function TaskCard({ task, isSelected, onClick }: TaskCardProps) {
  const info = STAGE_INFO[task.status]

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-3 rounded-xl border transition-all duration-150 group theme-surface"
      style={
        isSelected
          ? {
              background: 'rgba(134,59,255,0.07)',
              borderColor: 'rgba(134,59,255,0.25)',
            }
          : {
              background: 'transparent',
              borderColor: 'transparent',
            }
      }
      onMouseEnter={e => {
        if (!isSelected) {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card)'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
        }
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'
        }
      }}
      aria-pressed={isSelected}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 mt-0.5">
          <StatusIcon status={task.status} />
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="text-[13px] leading-snug line-clamp-2 font-medium"
            style={{ color: isSelected ? 'var(--text-1)' : 'var(--text-2)' }}
          >
            {task.question}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[10px] font-semibold" style={{ color: info.color }}>
              {info.label}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--text-4)' }}>·</span>
            <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{timeAgo(task.createdAt)}</span>
            {task.cost && (
              <>
                <span className="text-[10px]" style={{ color: 'var(--text-4)' }}>·</span>
                <span className="text-[10px] font-mono font-medium text-emerald-500">
                  ${task.cost.total.toFixed(3)}
                </span>
              </>
            )}
          </div>
        </div>

        {isSelected && (
          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--text-3)' }} />
        )}
      </div>
    </button>
  )
}
