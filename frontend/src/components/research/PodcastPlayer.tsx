import { useState, useRef, useEffect } from 'react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  RotateCcw,
  Sparkles,
  Headphones,
  AlertCircle,
  X,
  Radio,
  Minimize2,
  Maximize2,
  Coins
} from 'lucide-react'
import type { PodcastInfo } from '../../types/task'
import { Spinner } from '../ui/Spinner'
import { cn } from '../../utils/cn'

interface PodcastPlayerProps {
  taskId?: string
  podcast?: PodcastInfo
  onRequestPodcast: () => Promise<void>
  isRequesting?: boolean
  errorMessage?: string | null
}

const SPEED_OPTIONS = [1, 1.25, 1.5, 2]

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function PodcastPlayer({
  podcast,
  onRequestPodcast,
  isRequesting = false,
  errorMessage,
}: PodcastPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isOpen, setIsOpen] = useState(true)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (podcast?.durationSeconds && !duration) {
      setDuration(podcast.durationSeconds)
    }
  }, [podcast?.durationSeconds, duration])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || podcast?.durationSeconds || 0)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value)
    setCurrentTime(time)
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }

  const toggleSpeed = () => {
    const nextIdx = (SPEED_OPTIONS.indexOf(playbackRate) + 1) % SPEED_OPTIONS.length
    const nextRate = SPEED_OPTIONS[nextIdx]
    setPlaybackRate(nextRate)
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate
    }
  }

  const toggleMute = () => {
    if (!audioRef.current) return
    audioRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleDownload = () => {
    if (!podcast?.audioUrl) return
    const a = document.createElement('a')
    a.href = podcast.audioUrl
    a.download = `valyu-research-podcast.mp3`
    a.target = '_blank'
    a.click()
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full shadow-2xl border backdrop-blur-md transition-all hover:scale-105 cursor-pointer theme-surface no-print"
        style={{
          background: 'var(--bg-tooltip)',
          borderColor: 'var(--border-tooltip)',
          color: 'var(--text-1)',
        }}
      >
        <Radio className="w-4 h-4 text-purple-400 animate-pulse" />
        <span className="text-xs font-semibold">Podcast</span>
      </button>
    )
  }

  if (!podcast) {
    return (
      <div className="space-y-2 my-6 no-print">
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}
        <div
          className="p-4 rounded-2xl border backdrop-blur-md theme-surface"
          style={{
            background: 'linear-gradient(135deg, rgba(134,59,255,0.08) 0%, rgba(56,189,248,0.06) 100%)',
            borderColor: 'rgba(134,59,255,0.25)',
          }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex-shrink-0">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                    Listen as an AI Audio Deep-Dive
                  </h4>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-400 font-semibold border border-purple-500/30">
                    New
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                  Turn this research synthesis into a lively, conversational podcast discussion with natural pacing and emotion.
                </p>
              </div>
            </div>

            <button
              onClick={onRequestPodcast}
              disabled={isRequesting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex-shrink-0 w-full sm:w-auto justify-center"
            >
              {isRequesting ? (
                <>
                  <Spinner size="sm" color="#ffffff" />
                  <span>Queuing Podcast...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Podcast</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isGenerating =
    podcast.status === 'queued' ||
    podcast.status === 'generating_script' ||
    podcast.status === 'generating_audio'

  if (isGenerating) {
    const statusLabel =
      podcast.status === 'queued'
        ? 'Queued for generation…'
        : podcast.status === 'generating_script'
          ? 'Drafting conversational podcast script…'
          : 'Synthesizing voice audio & natural emotions…'

    return (
      <div
        className="p-4 rounded-2xl border backdrop-blur-md theme-surface my-6 animate-pulse no-print"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'rgba(134,59,255,0.3)',
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex-shrink-0">
              <Spinner size="sm" color="#a78bfa" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>
                  Generating AI Research Podcast
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-400">
                  Live
                </span>
              </div>
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-3)' }}>
                {statusLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div className="w-1.5 h-4 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-6 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-3 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            <div className="w-1.5 h-5 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: '450ms' }} />
          </div>
        </div>
      </div>
    )
  }

  if (podcast.status === 'failed') {
    return (
      <div
        className="p-4 rounded-2xl border theme-surface my-6 no-print"
        style={{
          background: 'rgba(248,113,113,0.08)',
          borderColor: 'rgba(248,113,113,0.25)',
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-rose-500/15 text-rose-400 flex-shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-semibold text-rose-400">Podcast Generation Failed</h4>
              <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
                {podcast.error || 'An error occurred while synthesizing the podcast audio.'}
              </p>
            </div>
          </div>

          <button
            onClick={onRequestPodcast}
            disabled={isRequesting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    )
  }

  if (podcast.status === 'completed' && podcast.audioUrl) {
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

    return (
      <div
        className={cn(
          'p-4 rounded-2xl border shadow-xl backdrop-blur-md theme-surface transition-all my-6 no-print',
          isMinimized ? 'py-2.5' : 'p-4'
        )}
        style={{
          background: 'var(--bg-card)',
          borderColor: 'rgba(134,59,255,0.35)',
        }}
      >
        <audio
          ref={audioRef}
          src={podcast.audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          preload="metadata"
        />

        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <Headphones className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-1)' }}>
                  AI Research Podcast
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30">
                  Ready
                </span>
                {podcast.cost && (
                  <div className="relative group/cost ml-1">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 cursor-help">
                      <Coins className="w-2.5 h-2.5 text-emerald-500" />
                      <span>${podcast.cost.total.toFixed(4)}</span>
                    </span>

                    <div
                      className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/cost:flex flex-col w-44 p-2 rounded-xl z-50 theme-surface text-xs shadow-xl border"
                      style={{
                        background: 'var(--bg-tooltip)',
                        borderColor: 'var(--border-tooltip)',
                        boxShadow: 'var(--shadow-tooltip)',
                      }}
                    >
                      <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-500 mb-1 flex items-center justify-between">
                        <span>Podcast Cost</span>
                        <span className="font-mono">${podcast.cost.total.toFixed(4)}</span>
                      </div>
                      <div className="space-y-0.5 text-[10px]">
                        <div className="flex justify-between" style={{ color: 'var(--text-2)' }}>
                          <span>Script (GPT):</span>
                          <span className="font-mono font-medium" style={{ color: 'var(--text-1)' }}>
                            ${podcast.cost.script.toFixed(4)}
                          </span>
                        </div>
                        <div className="flex justify-between" style={{ color: 'var(--text-2)' }}>
                          <span>Voice (TTS):</span>
                          <span className="font-mono font-medium" style={{ color: 'var(--text-1)' }}>
                            ${podcast.cost.tts.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-3)' }}>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded-md hover:bg-[var(--bg-sidebar)] transition-colors cursor-pointer"
              title={isMinimized ? 'Expand player' : 'Minimize player'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md hover:bg-[var(--bg-sidebar)] transition-colors cursor-pointer"
              title="Close player"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="space-y-1 my-3">
              <div className="relative flex items-center group">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-slate-700/40 rounded-lg appearance-none cursor-pointer accent-purple-500 focus:outline-none"
                  style={{
                    background: `linear-gradient(to right, #863bff 0%, #863bff ${progressPercent}%, var(--border) ${progressPercent}%, var(--border) 100%)`,
                  }}
                />
              </div>

              <div className="flex justify-between text-[11px] font-mono" style={{ color: 'var(--text-3)' }}>
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                </button>

                <button
                  onClick={toggleMute}
                  className="p-2 rounded-lg hover:bg-[var(--bg-sidebar)] transition-colors cursor-pointer"
                  style={{ color: 'var(--text-2)' }}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <button
                  onClick={toggleSpeed}
                  className="px-2 py-1 rounded-md text-[11px] font-mono font-semibold bg-[var(--bg-sidebar)] hover:bg-purple-500/15 hover:text-purple-400 border border-[var(--border)] transition-colors cursor-pointer"
                  style={{ color: 'var(--text-2)' }}
                  title="Playback speed"
                >
                  {playbackRate}x
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-sidebar)] hover:bg-purple-500/15 hover:text-purple-400 border border-[var(--border)] transition-colors cursor-pointer"
                  style={{ color: 'var(--text-2)' }}
                  title="Download MP3"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">MP3</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  return null
}
