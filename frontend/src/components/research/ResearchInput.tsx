import { useState, useRef, type KeyboardEvent } from 'react'
import {
  ArrowRight,
  BookOpen,
  Microscope,
  Database,
  Globe,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import heroImg from '../../assets/hero.png'
import { Spinner } from '../ui/Spinner'

interface ResearchInputProps {
  onSubmit: (question: string, searchType: string) => void
  isLoading: boolean
  error: string | null
}

const EXAMPLES = [
  'What are the latest advances in CRISPR gene editing for treating inherited diseases?',
  "How does mRNA vaccine technology compare to traditional vaccines for emerging pathogens?",
  "What is the current evidence for the gut microbiome's role in Alzheimer's disease?",
  'What are the most promising targets for treating antibiotic-resistant bacteria?',
  'How is quantum computing being applied to protein structure prediction?',
  'What does recent research say about the efficacy of GLP-1 agonists for NASH?',
]

const DOMAINS = [
  { id: 'all',         label: 'All Sources',          Icon: Globe },
  { id: 'proprietary', label: 'Academic & Premium',   Icon: BookOpen },
  { id: 'web',         label: 'Web Search',           Icon: Microscope },
  { id: 'news',        label: 'News Articles',        Icon: Database },
]

const MAX = 1000

export function ResearchInput({ onSubmit, isLoading, error }: ResearchInputProps) {
  const [question, setQuestion] = useState('')
  const [domain, setDomain]     = useState('all')
  const [exIdx, setExIdx]       = useState(0)
  const textRef                 = useRef<HTMLTextAreaElement>(null)

  const submit = () => {
    const q = question.trim()
    if (!q || isLoading) return
    onSubmit(q, domain)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  const tryExample = () => {
    setQuestion(EXAMPLES[exIdx])
    setExIdx(i => (i + 1) % EXAMPLES.length)
    textRef.current?.focus()
  }

  const chars = question.length
  const nearLimit = chars > MAX * 0.85

  return (
    <div className="relative min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="orb-float absolute rounded-full"
          style={{
            width: 520,
            height: 520,
            background: 'radial-gradient(circle, rgba(14,165,233,0.13) 0%, transparent 68%)',
            top: -160,
            left: '5%',
            opacity: 0.7,
          }}
        />
        <div
          className="orb-float-reverse absolute rounded-full"
          style={{
            width: 380,
            height: 380,
            background: 'radial-gradient(circle, rgba(134,59,255,0.11) 0%, transparent 68%)',
            bottom: -80,
            right: '8%',
            opacity: 0.7,
          }}
        />
      </div>

      <div className="dot-grid absolute inset-0 pointer-events-none" aria-hidden="true" />

      <div
        className="hidden xl:block absolute right-10 top-1/2 pointer-events-none select-none"
        style={{ transform: 'translateY(-55%)' }}
        aria-hidden="true"
      >
        <img
          src={heroImg}
          alt=""
          className="w-72 h-auto orb-float"
          style={{ filter: 'drop-shadow(0 0 40px rgba(134,59,255,0.25))' }}
        />
      </div>

      <div className="relative w-full max-w-[660px] fade-up">
        <div className="flex justify-center mb-8">
          <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide border"
            style={{
              background: 'rgba(134,59,255,0.1)',
              borderColor: 'rgba(134,59,255,0.25)',
              color: '#a855f7',
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Scientific Discovery
          </span>
        </div>

        <div className="text-center mb-10">
          <h1
            className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.15] mb-4"
            style={{ color: 'var(--text-1)' }}
          >
            What do you want to
            <br />
            <span className="gradient-text">research?</span>
          </h1>
          <p className="text-base leading-relaxed max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
            Ask any scientific question. Valyu searches academic papers, clinical trials,
            patents and datasets — then synthesises a cited research report.
          </p>
        </div>

        <div
          className="rounded-2xl border transition-all duration-300 theme-surface"
          style={{
            background: 'var(--bg-input)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-card)',
          }}
          onFocus={() => {}}
        >
          <div
            className="rounded-2xl border transition-all duration-300 focus-within:shadow-[0_0_0_2px_rgba(134,59,255,0.2)]"
            style={{ borderColor: 'transparent' }}
          >
            <textarea
              ref={textRef}
              id="research-question"
              value={question}
              onChange={e => setQuestion(e.target.value.slice(0, MAX))}
              onKeyDown={onKeyDown}
              rows={4}
              disabled={isLoading}
              placeholder="e.g. What are the latest advances in CRISPR gene editing for treating inherited diseases?"
              className="w-full bg-transparent text-base resize-none outline-none leading-relaxed px-5 pt-5 pb-2 rounded-2xl font-sans"
              style={{
                color: 'var(--text-1)',
              }}
              aria-label="Research question"
            />

            <div
              className="flex items-center justify-between px-5 py-3 border-t"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-4">
                <span
                  className="text-xs tabular-nums"
                  style={{ color: nearLimit ? '#f59e0b' : 'var(--text-3)' }}
                >
                  {chars}/{MAX}
                </span>
                <button
                  type="button"
                  onClick={tryExample}
                  className="flex items-center gap-1.5 text-xs transition-colors"
                  style={{ color: 'var(--text-3)' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = '#863bff')}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)')}
                >
                  <Sparkles className="w-3 h-3" />
                  Try an example
                </button>
              </div>

              <button
                type="button"
                onClick={submit}
                disabled={!question.trim() || isLoading}
                id="submit-research-btn"
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #863bff 100%)',
                  boxShadow: question.trim() ? '0 4px 20px rgba(134,59,255,0.35)' : 'none',
                }}
                aria-label="Start research"
              >
                {isLoading ? (
                  <><Spinner size="xs" color="white" /> Starting…</>
                ) : (
                  <>Research <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] mt-2.5" style={{ color: 'var(--text-3)' }}>
          Press{' '}
          <kbd
            className="px-1.5 py-0.5 rounded text-[10px] font-mono"
            style={{ background: 'var(--kbd-bg)', border: '1px solid var(--kbd-border)', color: 'var(--text-3)' }}
          >
            ⌘ Enter
          </kbd>{' '}
          to submit
        </p>

        <div className="mt-8">
          <p
            className="text-center text-[10px] uppercase tracking-widest mb-3 font-semibold"
            style={{ color: 'var(--text-3)' }}
          >
            Focus your search
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {DOMAINS.map(({ id, label, Icon }) => {
              const active = domain === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDomain(id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all duration-200"
                  style={
                    active
                      ? {
                          background: 'rgba(134,59,255,0.12)',
                          borderColor: 'rgba(134,59,255,0.40)',
                          color: '#a855f7',
                        }
                      : {
                          background: 'var(--bg-card)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-3)',
                        }
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {error && (
          <div
            className="mt-5 flex items-start gap-2.5 p-3.5 rounded-xl border text-sm fade-up"
            style={{
              background: 'rgba(248,113,113,0.08)',
              borderColor: 'rgba(248,113,113,0.20)',
              color: '#f87171',
            }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-center text-[11px] mt-10" style={{ color: 'var(--text-4)' }}>
          Powered by Valyu Search · Academic papers · Clinical trials · Patents · Datasets
        </p>
      </div>
    </div>
  )
}
