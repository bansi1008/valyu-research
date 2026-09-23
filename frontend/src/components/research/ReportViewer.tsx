import { useState, useRef, useMemo, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import {
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  Link2,
  ChevronRight,
  ListTree,
  Clock,
  Quote,
  X,
  Coins,
  Brain,
  FileText
} from 'lucide-react'
import type { Task, Citation } from '../../types/task'
import { requestPodcast } from '../../api/client'
import { PodcastPlayer } from './PodcastPlayer'
import { cn } from '../../utils/cn'

interface ReportViewerProps {
  task: Task
  onPodcastRequested?: () => void
}

interface HeadingItem {
  id: string
  text: string
  level: number
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50)
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url.slice(0, 30)
  }
}

export function getSourceMetadata(url: string) {
  const lower = url.toLowerCase()
  if (lower.includes('arxiv.org')) {
    return { name: 'arXiv', type: 'Preprint', bg: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30' }
  }
  if (lower.includes('ncbi.nlm.nih.gov') || lower.includes('pubmed')) {
    return { name: 'PubMed / NIH', type: 'Peer-Reviewed', bg: 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30' }
  }
  if (lower.includes('nature.com')) {
    return { name: 'Nature', type: 'Journal', bg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30' }
  }
  if (lower.includes('biorxiv.org') || lower.includes('medrxiv.org')) {
    return { name: 'bioRxiv / medRxiv', type: 'Preprint', bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30' }
  }
  if (lower.includes('clinicaltrials.gov')) {
    return { name: 'ClinicalTrials', type: 'Registry', bg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/30' }
  }
  if (lower.includes('sciencedirect.com')) {
    return { name: 'ScienceDirect', type: 'Journal', bg: 'bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-500/30' }
  }
  if (lower.includes('ieee.org')) {
    return { name: 'IEEE', type: 'Publication', bg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30' }
  }
  if (lower.includes('doi.org')) {
    return { name: 'DOI Resolver', type: 'Publication', bg: 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30' }
  }
  return { name: safeHostname(url), type: 'Source', bg: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30' }
}

function linkifyCitations(markdown: string): string {
  if (!markdown) return ''

  const parts = markdown.split(/(```[\s\S]*?```|`[^`]+`|\$\$[\s\S]*?\$\$|\$[^\$\n]+\$)/g)

  return parts
    .map((part, idx) => {
      if (idx % 2 === 1) return part

      let res = part.replace(/\[(\d+)\s*[-–]\s*(\d+)\](?!\()/g, (_match, start, end) => {
        return `[${start}](#cite-${start})–[${end}](#cite-${end})`
      })

      res = res.replace(/\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g, (_match, digits) => {
        const nums = digits.split(',').map((s: string) => s.trim()).filter(Boolean)
        return nums.map((n: string) => `[${n}](#cite-${n})`).join('')
      })

      return res
    })
    .join('')
}

export function ReportViewer({ task, onPodcastRequested }: ReportViewerProps) {
  const [copied, setCopied]                 = useState(false)
  const [copiedBibItem, setCopiedBibItem]   = useState<number | null>(null)
  const [citOpen, setCitOpen]               = useState(true)
  const [tocOpen, setTocOpen]               = useState(true)
  const [reasoningOpen, setReasoningOpen]   = useState(false)
  const [isRequestingPodcast, setIsRequestingPodcast] = useState(false)
  const [podcastError, setPodcastError]     = useState<string | null>(null)
  const [activeHeading, setActiveHeading]   = useState<string>('')
  const [activeCitation, setActiveCitation] = useState<number | null>(null)

  const reportRef = useRef<HTMLDivElement>(null)
  const citations = task.citations ?? []
  const reasoning = task.reasoning ?? []

  const handleRequestPodcast = async () => {
    setIsRequestingPodcast(true)
    setPodcastError(null)
    try {
      await requestPodcast(task.id)
      if (onPodcastRequested) {
        onPodcastRequested()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to request podcast'
      setPodcastError(msg)
      console.error(err)
    } finally {
      setIsRequestingPodcast(false)
    }
  }

  const headings = useMemo<HeadingItem[]>(() => {
    if (!task.report) return []
    const lines = task.report.split('\n')
    const items: HeadingItem[] = []

    lines.forEach((line) => {
      const match = line.match(/^(#{2,3})\s+(.+)$/)
      if (match) {
        const level = match[1].length
        const rawText = match[2].trim()
        const text = rawText.replace(/\*\*/g, '').replace(/`/g, '')
        items.push({
          id: slugify(text),
          text,
          level,
        })
      }
    })
    return items
  }, [task.report])

  const metrics = useMemo(() => {
    const text = task.report ?? ''
    const words = text.trim() ? text.trim().split(/\s+/).length : 0
    const readTimeMin = Math.max(1, Math.ceil(words / 220))
    return {
      words,
      readTimeMin,
    }
  }, [task.report])

  const processedReport = useMemo(() => {
    return linkifyCitations(task.report ?? '')
  }, [task.report])

  useEffect(() => {
    const scrollEl = reportRef.current
    if (!scrollEl || headings.length === 0) return

    const handleScroll = () => {
      const headingElements = headings
        .map((h) => ({ id: h.id, el: document.getElementById(h.id) }))
        .filter((h) => h.el !== null)

      const scrollPos = scrollEl.scrollTop + 100

      for (let i = headingElements.length - 1; i >= 0; i--) {
        const { id, el } = headingElements[i]
        if (el && (el as HTMLElement).offsetTop <= scrollPos) {
          setActiveHeading(id)
          return
        }
      }
      if (headingElements.length > 0) {
        setActiveHeading(headingElements[0].id)
      }
    }

    scrollEl.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollEl.removeEventListener('scroll', handleScroll)
  }, [headings])

  const handleCopy = async () => {
    if (!task.report) return
    try {
      await navigator.clipboard.writeText(task.report)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
    }
  }

  const handleCopySingleBib = async (c: Citation, e: React.MouseEvent) => {
    e.stopPropagation()
    const bib = `@misc{source_${c.number},\n  title = {${c.title.replace(/[{}]/g, '')}},\n  url = {${c.url}}\n}`
    try {
      await navigator.clipboard.writeText(bib)
      setCopiedBibItem(c.number)
      setTimeout(() => setCopiedBibItem(null), 1800)
    } catch {
    }
  }

  const handleHeadingClick = (id: string) => {
    const el = document.getElementById(id)
    if (el && reportRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveHeading(id)
    }
  }

  const handleCitationClick = (num: number) => {
    setCitOpen(true)
    setActiveCitation(num)

    setTimeout(() => {
      const elements = document.querySelectorAll(`[data-source-id="${num}"]`)
      for (const el of elements) {
        if ((el as HTMLElement).offsetParent !== null) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          break
        }
      }
    }, 80)
  }

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {headings.length > 0 && tocOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs no-print"
            onClick={() => setTocOpen(false)}
          />

          <aside
            className="fixed md:static inset-y-0 left-0 z-50 md:z-auto flex flex-col w-80 md:w-72 flex-shrink-0 border-r overflow-hidden theme-surface animate-in slide-in-from-left-4 duration-200 no-print"
            style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}
          >
            <div
              className="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0"
              style={{ background: 'var(--bg-report-bar)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <ListTree className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>
                  Outline
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-card)', color: 'var(--text-3)' }}>
                  {headings.length}
                </span>
              </div>

              <button
                onClick={() => setTocOpen(false)}
                className="p-1 rounded-md transition-colors hover:bg-[var(--bg-card)] flex items-center justify-center cursor-pointer"
                style={{ color: 'var(--text-3)' }}
                aria-label="Close outline"
                title="Close outline"
              >
                <X className="w-4 h-4 hover:text-[var(--text-1)]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {headings.map((h) => {
                const isActive = activeHeading === h.id
                return (
                  <button
                    key={h.id}
                    onClick={() => {
                      handleHeadingClick(h.id)
                      if (window.innerWidth < 768) {
                        setTocOpen(false)
                      }
                    }}
                    className={cn(
                      'block w-full text-left py-1.5 px-2.5 rounded-lg transition-all cursor-pointer',
                      h.level === 3 ? 'pl-5' : '',
                      isActive
                        ? 'bg-purple-500/15 text-purple-500 border-l-2 border-purple-500'
                        : 'hover:bg-[var(--bg-card)]'
                    )}
                    style={{ color: isActive ? undefined : 'var(--text-2)' }}
                  >
                    <span
                      className={cn(
                        'block break-words leading-snug line-clamp-2',
                        h.level === 3 ? 'text-[11px]' : 'text-xs font-medium'
                      )}
                    >
                      {h.text}
                    </span>
                  </button>
                )
              })}
            </div>
          </aside>
        </>
      )}

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b flex-shrink-0 backdrop-blur-md theme-surface no-print"
          style={{
            background: 'var(--bg-report-bar)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {headings.length > 0 && (
              <button
                onClick={() => setTocOpen((p) => !p)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer',
                  tocOpen
                    ? 'bg-purple-500/15 text-purple-500 border-purple-500/30'
                    : 'border-transparent hover:bg-[var(--bg-card)]'
                )}
                style={{ color: tocOpen ? undefined : 'var(--text-2)' }}
                title="Toggle Table of Contents"
              >
                <ListTree className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Outline</span>
              </button>
            )}

            {reasoning.length > 0 && (
              <button
                onClick={() => setReasoningOpen((p) => !p)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer',
                  reasoningOpen
                    ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                    : 'border-transparent hover:bg-[var(--bg-card)]'
                )}
                style={{ color: reasoningOpen ? undefined : 'var(--text-2)' }}
                title="View multi-angle research reasoning and sources"
              >
                <Brain className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Reasoning</span>
                <span className="text-[10px] font-mono px-1 rounded bg-amber-500/15 text-amber-400">
                  {reasoning.length}
                </span>
              </button>
            )}

            <div className="h-4 w-px bg-slate-700/30 mx-1 hidden sm:block" />

            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] flex-shrink-0" />
            <span className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>
              Scientific Synthesis
            </span>
            {citations.length > 0 && (
              <span className="text-[11px] hidden sm:inline ml-1" style={{ color: 'var(--text-3)' }}>
                · {citations.length} sources
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <BarBtn onClick={handleCopy}>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </BarBtn>

            {citations.length > 0 && (
              <BarBtn onClick={() => setCitOpen((p) => !p)} className="lg:hidden">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Sources</span>
              </BarBtn>
            )}
          </div>
        </div>

        <div ref={reportRef} className="flex-1 overflow-y-auto px-6 lg:px-10 py-8 scroll-smooth">
          <div className="max-w-3xl mx-auto mb-8">
            <div className="flex items-center gap-2 mb-2 no-print">
              <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-3)' }}>
                Research Synthesis
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold leading-snug" style={{ color: 'var(--text-1)' }}>
              {task.question}
            </h1>

            <div
              className="flex flex-wrap items-center gap-4 mt-4 pt-3 pb-3 border-y text-xs no-print"
              style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}
            >
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>{metrics.readTimeMin} min read</span>
              </span>
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>{metrics.words.toLocaleString()} words</span>
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span>{citations.length} cited sources</span>
              </span>
              {task.cost && (
                <div className="relative group/cost ml-auto">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 cursor-help">
                    <Coins className="w-3 h-3 text-emerald-500" />
                    <span>${task.cost.total.toFixed(4)}</span>
                  </span>

                  <div
                    className="pointer-events-none absolute bottom-full right-0 mb-2 hidden group-hover/cost:flex flex-col w-52 p-2.5 rounded-xl z-50 transition-all duration-150 theme-surface text-xs shadow-xl border"
                    style={{
                      background: 'var(--bg-tooltip)',
                      borderColor: 'var(--border-tooltip)',
                      boxShadow: 'var(--shadow-tooltip)',
                    }}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1.5 flex items-center justify-between">
                      <span>Task Cost</span>
                      <span className="font-mono font-semibold">${task.cost.total.toFixed(4)}</span>
                    </div>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between" style={{ color: 'var(--text-2)' }}>
                        <span>Valyu Retrieval:</span>
                        <span className="font-mono font-medium" style={{ color: 'var(--text-1)' }}>
                          ${task.cost.valyu.toFixed(4)}
                        </span>
                      </div>
                      <div className="flex justify-between" style={{ color: 'var(--text-2)' }}>
                        <span>OpenAI (GPT):</span>
                        <span className="font-mono font-medium" style={{ color: 'var(--text-1)' }}>
                          ${task.cost.openai.toFixed(4)}
                        </span>
                      </div>
                      <div className="flex justify-between" style={{ color: 'var(--text-2)' }}>
                        <span>Jev Validation:</span>
                        <span className="font-mono font-medium" style={{ color: 'var(--text-1)' }}>
                          ${task.cost.jev.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="max-w-3xl mx-auto">
            <PodcastPlayer
              taskId={task.id}
              podcast={task.podcast}
              onRequestPodcast={handleRequestPodcast}
              isRequesting={isRequestingPodcast}
              errorMessage={podcastError}
            />

            {task.report ? (
              <div className="prose fade-up">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    h2: ({ children, ...props }) => {
                      const text = String(children).replace(/\*\*/g, '').replace(/`/g, '')
                      const id = slugify(text)
                      return (
                        <h2 id={id} className="scroll-mt-6 group/h" {...props}>
                          {children}
                        </h2>
                      )
                    },
                    h3: ({ children, ...props }) => {
                      const text = String(children).replace(/\*\*/g, '').replace(/`/g, '')
                      const id = slugify(text)
                      return (
                        <h3 id={id} className="scroll-mt-6 group/h" {...props}>
                          {children}
                        </h3>
                      )
                    },
                    a: ({ href, children, ...props }) => {
                      if (href?.startsWith('#cite-')) {
                        const num = parseInt(href.replace('#cite-', ''), 10)
                        const matchedCitation = citations.find((c) => c.number === num)
                        return (
                          <CitationBadge
                            number={num}
                            citation={matchedCitation}
                            isActive={activeCitation === num}
                            onClick={() => handleCitationClick(num)}
                          />
                        )
                      }
                      return (
                        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                          {children}
                        </a>
                      )
                    },
                  }}
                >
                  {processedReport}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                No report content available.
              </p>
            )}
          </div>

          {citations.length > 0 && (
            <div className="max-w-3xl mx-auto mt-12 lg:hidden no-print">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                    Cited Sources ({citations.length})
                  </h2>
                </div>
              </div>
              <div className="space-y-2">
                {citations.map((c) => (
                  <CitationCard
                    key={c.number}
                    citation={c}
                    isActive={activeCitation === c.number}
                    isCopiedBib={copiedBibItem === c.number}
                    onSelect={() => handleCitationClick(c.number)}
                    onCopyBib={(e) => handleCopySingleBib(c, e)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {citations.length > 0 && (
        <aside
          className={`hidden lg:flex flex-col flex-shrink-0 overflow-hidden border-l transition-all duration-300 ease-in-out theme-surface no-print ${
            citOpen ? 'w-80' : 'w-10'
          }`}
          style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}
        >
          <div
            className="flex items-center justify-between px-3 py-2.5 border-b flex-shrink-0 backdrop-blur-md"
            style={{ background: 'var(--bg-report-bar)', borderColor: 'var(--border)' }}
          >
            {citOpen && (
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2 min-w-0">
                  <BookOpen className="w-4 h-4 flex-shrink-0 text-purple-400" />
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>
                    Sources
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                    style={{
                      background: 'var(--bg-card)',
                      color: 'var(--text-3)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {citations.length}
                  </span>
                </div>
              </div>
            )}
            <button
              onClick={() => setCitOpen((p) => !p)}
              className="p-1 rounded transition-colors flex-shrink-0 ml-auto"
              style={{ color: 'var(--text-3)' }}
              aria-label={citOpen ? 'Collapse sources' : 'Expand sources'}
            >
              <ChevronRight
                className="w-4 h-4 transition-transform duration-300"
                style={{ transform: citOpen ? 'rotate(0deg)' : 'rotate(180deg)' }}
              />
            </button>
          </div>

          {citOpen && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {citations.map((c) => (
                <CitationCard
                  key={c.number}
                  citation={c}
                  isActive={activeCitation === c.number}
                  isCopiedBib={copiedBibItem === c.number}
                  onSelect={() => handleCitationClick(c.number)}
                  onCopyBib={(e) => handleCopySingleBib(c, e)}
                />
              ))}
            </div>
          )}
        </aside>
      )}

      {reasoningOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs no-print">
          <div
            className="fixed inset-0"
            onClick={() => setReasoningOpen(false)}
          />

          <div
            className="relative w-full max-w-xl h-full flex flex-col border-l theme-surface shadow-2xl z-10 animate-in slide-in-from-right duration-200"
            style={{
              background: 'var(--bg-sidebar)',
              borderColor: 'var(--border)',
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
              style={{
                background: 'var(--bg-report-bar)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
                    Research Strategy & Reasoning
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      {reasoning.length} angles
                    </span>
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                    Planned investigative sub-questions and corresponding Valyu sources
                  </p>
                </div>
              </div>

              <button
                onClick={() => setReasoningOpen(false)}
                className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-card)] cursor-pointer"
                style={{ color: 'var(--text-3)' }}
                aria-label="Close reasoning panel"
              >
                <X className="w-5 h-5 hover:text-[var(--text-1)]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {reasoning.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border transition-all"
                  style={{
                    background: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30 uppercase tracking-wider">
                      Angle {idx + 1}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold leading-snug mb-2" style={{ color: 'var(--text-1)' }}>
                    {item.question}
                  </h3>

                  {item.purpose && (
                    <div
                      className="p-2.5 rounded-lg text-xs leading-relaxed mb-3"
                      style={{
                        background: 'var(--bg-sidebar)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-2)',
                      }}
                    >
                      <span className="font-semibold text-purple-400 mr-1.5">Intent:</span>
                      {item.purpose}
                    </div>
                  )}

                  {item.sources && item.sources.length > 0 && (
                    <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-500 flex items-center justify-between">
                        <span>Discovered Sources</span>
                        <span className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
                          {item.sources.length} sources
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {item.sources.map((src, sIdx) => {
                          const meta = getSourceMetadata(src.url)
                          return (
                            <a
                              key={sIdx}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex items-start justify-between gap-3 p-2.5 rounded-lg border transition-all hover:border-purple-500/50 hover:bg-purple-500/5"
                              style={{
                                background: 'var(--bg-sidebar)',
                                borderColor: 'var(--border)',
                              }}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-semibold border', meta.bg)}>
                                    {meta.name}
                                  </span>
                                  <span className="text-[10px] font-mono truncate" style={{ color: 'var(--text-3)' }}>
                                    {safeHostname(src.url)}
                                  </span>
                                </div>
                                <p className="text-xs font-medium line-clamp-2 transition-colors group-hover:text-purple-400" style={{ color: 'var(--text-1)' }}>
                                  {src.title}
                                </p>
                              </div>

                              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 opacity-50 group-hover:opacity-100 group-hover:text-purple-400 transition-opacity mt-1" />
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CitationBadge({
  number,
  citation,
  isActive,
  onClick,
}: {
  number: number
  citation?: Citation
  isActive: boolean
  onClick: () => void
}) {
  const meta = citation ? getSourceMetadata(citation.url) : null

  return (
    <span className="relative inline-block align-baseline group/cite mx-0.5">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onClick()
        }}
        className={cn(
          'inline-flex items-center justify-center font-bold font-mono transition-all duration-150 cursor-pointer select-none leading-none -translate-y-[1px]',
          'text-[10px] min-w-[1.25rem] h-[1.25rem] px-1 rounded-md',
          isActive
            ? 'bg-purple-600 text-white shadow-[0_0_14px_rgba(134,59,255,0.7)] scale-110 ring-2 ring-purple-400'
            : 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30 hover:bg-purple-600 hover:text-white hover:border-purple-600 hover:scale-105 active:scale-95'
        )}
        title={citation ? `[${number}] ${citation.title}` : `Source [${number}]`}
        aria-label={`Highlight source ${number}`}
      >
        {number}
      </button>

      {citation && (
        <div
          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover/cite:flex flex-col w-72 p-3 rounded-xl z-50 transition-all duration-150"
          style={{
            background: 'var(--bg-tooltip)',
            border: '1px solid var(--border-tooltip)',
            boxShadow: 'var(--shadow-tooltip)',
          }}
        >
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="flex items-center gap-1 text-[10px] font-bold text-purple-500 dark:text-purple-400 uppercase tracking-wider">
              <BookOpen className="w-3 h-3 flex-shrink-0" />
              Source [{number}]
            </span>
            {meta && (
              <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-semibold border', meta.bg)}>
                {meta.name}
              </span>
            )}
          </div>

          <p className="text-[12px] font-medium leading-snug line-clamp-3 mb-2" style={{ color: 'var(--text-1)' }}>
            {citation.title}
          </p>

          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px]"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-3)',
            }}
          >
            <Link2 className="w-2.5 h-2.5 flex-shrink-0 text-purple-400" />
            <span className="truncate font-mono">{safeHostname(citation.url)}</span>
            <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 ml-auto opacity-70" />
          </div>

          <div
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-r border-b"
            style={{
              background: 'var(--bg-tooltip)',
              borderColor: 'var(--border-tooltip)',
            }}
          />
        </div>
      )}
    </span>
  )
}

function BarBtn({
  onClick,
  children,
  className = '',
}: {
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${className}`}
      style={{ color: 'var(--text-2)' }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card)'
        ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-1)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
        ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)'
      }}
    >
      {children}
    </button>
  )
}

function CitationCard({
  citation,
  isActive,
  isCopiedBib,
  onSelect,
  onCopyBib,
}: {
  citation: Citation
  isActive?: boolean
  isCopiedBib?: boolean
  onSelect?: () => void
  onCopyBib?: (e: React.MouseEvent) => void
}) {
  const meta = getSourceMetadata(citation.url)

  return (
    <div
      data-source-id={citation.number}
      onClick={onSelect}
      className={cn(
        'relative flex flex-col p-3 rounded-xl border transition-all duration-300 group cursor-pointer theme-surface',
        isActive
          ? 'ring-2 ring-purple-500 bg-purple-500/10 border-purple-500/50 shadow-[0_0_20px_rgba(134,59,255,0.25)]'
          : 'hover:border-[var(--border-strong)]'
      )}
      style={{
        background: isActive ? undefined : 'var(--bg-card)',
        borderColor: isActive ? undefined : 'var(--border)',
      }}
      aria-label={`Source ${citation.number}: ${citation.title}`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            'flex-shrink-0 w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center mt-0.5 transition-colors',
            isActive
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-purple-500/15 text-purple-600 dark:text-purple-300'
          )}
        >
          {citation.number}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className={cn('text-[9px] px-1.5 py-0.2 rounded font-semibold border', meta.bg)}>
              {meta.name}
            </span>
            {meta.type && (
              <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>
                · {meta.type}
              </span>
            )}
          </div>

          <p
            className="text-[12px] font-medium leading-snug line-clamp-3 transition-colors"
            style={{ color: 'var(--text-1)' }}
          >
            {citation.title}
          </p>

          <div className="flex items-center justify-between gap-1 mt-2.5 text-[10px]" style={{ color: 'var(--text-3)' }}>
            <div className="flex items-center gap-1 min-w-0">
              <Link2 className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate font-mono">{safeHostname(citation.url)}</span>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {onCopyBib && (
                <button
                  onClick={onCopyBib}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors hover:bg-purple-500/15 hover:text-purple-400"
                  style={{ color: 'var(--text-3)' }}
                  title="Copy BibTeX entry to clipboard"
                >
                  {isCopiedBib ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Quote className="w-2.5 h-2.5" />}
                  <span>{isCopiedBib ? 'Copied' : 'BibTeX'}</span>
                </button>
              )}
              <a
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors hover:bg-purple-500/15 hover:text-purple-500"
                style={{ color: 'var(--text-2)' }}
                title="Open source link in new tab"
              >
                <span>Visit</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {isActive && (
        <span className="absolute top-2 right-2 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
        </span>
      )}
    </div>
  )
}
