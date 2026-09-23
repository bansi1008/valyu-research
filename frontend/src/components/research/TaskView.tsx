import { useEffect } from 'react'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import type { TaskStatus } from '../../types/task'
import { useTaskPolling } from '../../hooks/useSSE'
import { PipelineStages } from './PipelineStages'
import { ReportViewer } from './ReportViewer'
import { Spinner } from '../ui/Spinner'

interface TaskViewProps {
  taskId: string
  onBack: () => void
  onTaskUpdate?: (id: string, status: TaskStatus, cost?: import('../../types/task').TaskCost) => void
}

export function TaskView({ taskId, onBack, onTaskUpdate }: TaskViewProps) {
  const { task, loading, error, reconnectSSE } = useTaskPolling(taskId)

  useEffect(() => {
    if (task && onTaskUpdate) onTaskUpdate(task.id, task.status, task.cost)
  }, [task?.id, task?.status, task?.cost, onTaskUpdate])

  if (loading && !task) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] gap-4">
        <Spinner size="lg" color="#863bff" />
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>Loading research task…</p>
      </div>
    )
  }

  if (error && !task) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] gap-5 px-4">
        <div
          className="p-5 rounded-2xl border text-center max-w-md fade-up"
          style={{ background: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.20)' }}
        >
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
          <p className="font-semibold text-rose-400 mb-2">Failed to load task</p>
          <p className="text-sm" style={{ color: 'rgba(248,113,113,0.75)' }}>{error}</p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm transition-colors"
          style={{ color: 'var(--text-3)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to research
        </button>
      </div>
    )
  }

  if (!task) return null

  const isComplete = task.status === 'completed'

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {!isComplete && (
        <div
          className="flex items-center gap-3 px-5 py-2.5 border-b flex-shrink-0 theme-surface"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-1)')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)')}
            aria-label="Back to search"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {isComplete ? (
          <ReportViewer task={task} onPodcastRequested={reconnectSSE} />
        ) : (
          <div className="h-full overflow-y-auto">
            <PipelineStages task={task} />
          </div>
        )}
      </div>
    </div>
  )
}
