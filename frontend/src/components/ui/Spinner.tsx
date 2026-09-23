import { cn } from '../../utils/cn'

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  color?: string
  className?: string
}

const SIZE = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border-2',
  md: 'w-5 h-5 border-2',
  lg: 'w-8 h-8 border-[3px]',
}

export function Spinner({ size = 'md', color = '#38bdf8', className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-block rounded-full border-transparent animate-spin', SIZE[size], className)}
      style={{ borderTopColor: color }}
    />
  )
}
