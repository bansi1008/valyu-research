import { X, FlaskConical, History } from 'lucide-react'
import type { TaskHistoryItem } from '../../types/task'
import { TaskCard } from './TaskCard'

interface TaskSidebarProps {
  tasks: TaskHistoryItem[]
  selectedTaskId: string | null
  onSelectTask: (id: string) => void
  isOpen: boolean
  onClose: () => void
}

export function TaskSidebar({
  tasks,
  selectedTaskId,
  onSelectTask,
  isOpen,
  onClose,
}: TaskSidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r theme-surface',
          'lg:static lg:translate-x-0 lg:h-full',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{
          width: 272,
          background: 'var(--bg-sidebar)',
          borderColor: 'var(--border)',
        }}
        aria-label="Research history"
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4" style={{ color: 'var(--text-3)' }} />
            <span className="text-[13px] font-semibold" style={{ color: 'var(--text-2)' }}>
              Research History
            </span>
            {tasks.length > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                style={{ background: 'var(--bg-card)', color: 'var(--text-3)', border: '1px solid var(--border)' }}
              >
                {tasks.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded transition-colors"
            style={{ color: 'var(--text-3)' }}
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <FlaskConical className="w-6 h-6" style={{ color: 'var(--text-3)' }} />
              </div>
              <p className="text-[13px] font-semibold mb-1" style={{ color: 'var(--text-2)' }}>
                No research yet
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
                Submit a question to start your first research task
              </p>
            </div>
          ) : (
            tasks.map(t => (
              <TaskCard
                key={t.id}
                task={t}
                isSelected={selectedTaskId === t.id}
                onClick={() => onSelectTask(t.id)}
              />
            ))
          )}
        </div>
      </aside>
    </>
  )
}
