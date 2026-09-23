import { Moon, Sun, Plus, Menu } from 'lucide-react'

function ValyuMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 46" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="currentColor"
        d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"
      />
    </svg>
  )
}

interface HeaderProps {
  onNewResearch: () => void
  onToggleSidebar: () => void
  onToggleTheme: () => void
  isDark: boolean
  showNewButton?: boolean
}

export function Header({
  onNewResearch,
  onToggleSidebar,
  onToggleTheme,
  isDark,
  showNewButton,
}: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-4 h-14 border-b theme-surface flex-shrink-0 backdrop-blur-md"
      style={{
        background: 'var(--bg-header)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-2)' }}
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={onNewResearch}
          className="flex items-center gap-2.5 group"
          aria-label="Go to homepage"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm"
            style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #863bff 100%)' }}
          >
            <ValyuMark className="w-4 h-4 text-white" />
          </div>

          <span
            className="hidden sm:block font-extrabold text-[0.95rem] tracking-tight"
            style={{ color: 'var(--text-1)' }}
          >
            Valyu
            <span className="gradient-text"> Research</span>
          </span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {showNewButton && (
          <button
            onClick={onNewResearch}
            id="new-research-btn"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
            style={{ color: 'var(--text-2)' }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card-hover)'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-1)'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)'
            }}
          >
            <Plus className="w-4 h-4" />
            New Research
          </button>
        )}

        <button
          onClick={onToggleTheme}
          id="theme-toggle-btn"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border)',
            color: 'var(--text-2)',
          }}
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-500" />
          )}
        </button>
      </div>
    </header>
  )
}
