import { useState, useCallback, useEffect } from 'react'
import { Header } from './components/layout/Header'
import { TaskSidebar } from './components/research/TaskSidebar'
import { ResearchInput } from './components/research/ResearchInput'
import { TaskView } from './components/research/TaskView'
import { createTask, fetchTask } from './api/client'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useTheme } from './hooks/useTheme'
import type { TaskHistoryItem, TaskStatus, TaskCost } from './types/task'

function App() {
  const { toggle, isDark } = useTheme()

  const [selectedTaskId, setSelectedTaskId] = useLocalStorage<string | null>('valyu-selected-task', null)
  const [taskHistory, setTaskHistory]       = useLocalStorage<TaskHistoryItem[]>('valyu-task-history', [])
  const [sidebarOpen, setSidebarOpen]       = useState(false)
  const [isCreating, setIsCreating]         = useState(false)
  const [createError, setCreateError]       = useState<string | null>(null)

  const handleSubmit = useCallback(
    async (question: string, searchType: string = 'all') => {
      setIsCreating(true)
      setCreateError(null)
      try {
        const { taskId } = await createTask(question, searchType)
        const item: TaskHistoryItem = {
          id: taskId,
          question,
          searchType: searchType as import('./types/task').SearchType,
          status: 'queued',
          createdAt: new Date().toISOString(),
        }
        setTaskHistory(prev => [item, ...prev].slice(0, 50))
        setSelectedTaskId(taskId)
      } catch (e) {
        setCreateError(
          e instanceof Error ? e.message : 'Failed to start research. Please try again.',
        )
      } finally {
        setIsCreating(false)
      }
    },
    [setTaskHistory, setSelectedTaskId],
  )

  const handleTaskUpdate = useCallback(
    (id: string, status: TaskStatus, cost?: TaskCost) => {
      setTaskHistory(prev =>
        prev.map(t => (t.id === id ? { ...t, status, cost: cost ?? t.cost } : t)),
      )
    },
    [setTaskHistory],
  )

  useEffect(() => {
    const pending = taskHistory.filter(t => t.status !== 'completed' && t.status !== 'failed')
    if (pending.length === 0) return

    pending.forEach(async (item) => {
      try {
        const remote = await fetchTask(item.id)
        if (remote && (remote.status !== item.status || remote.cost !== item.cost)) {
          setTaskHistory(prev =>
            prev.map(t =>
              t.id === item.id ? { ...t, status: remote.status, cost: remote.cost ?? t.cost } : t,
            ),
          )
        }
      } catch {
      }
    })
  }, [])

  const handleBack = useCallback(() => setSelectedTaskId(null), [setSelectedTaskId])

  return (
    <div className="min-h-screen flex flex-col theme-surface" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
      <Header
        onNewResearch={handleBack}
        onToggleSidebar={() => setSidebarOpen(p => !p)}
        onToggleTheme={toggle}
        isDark={isDark}
        showNewButton={!!selectedTaskId}
      />

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
        <TaskSidebar
          tasks={taskHistory}
          selectedTaskId={selectedTaskId}
          onSelectTask={id => { setSelectedTaskId(id); setSidebarOpen(false) }}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0 overflow-hidden">
          {selectedTaskId ? (
            <TaskView
              key={selectedTaskId}
              taskId={selectedTaskId}
              onBack={handleBack}
              onTaskUpdate={handleTaskUpdate}
            />
          ) : (
            <div className="h-full overflow-y-auto">
              <ResearchInput
                onSubmit={handleSubmit}
                isLoading={isCreating}
                error={createError}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
