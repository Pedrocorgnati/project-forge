import Image from 'next/image'
import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string
  alt?: string
  name?: string
  size?: 'sm' | 'md' | 'lg'
  decorative?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return ''
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({ src, alt, name, size = 'md', decorative = false, className }: AvatarProps) {
  const initials = name ? getInitials(name) : ''
  const ariaLabel = decorative ? undefined : (alt || (name ? `Avatar de ${name}: iniciais ${initials}` : undefined))

  return (
    <span
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={!decorative ? ariaLabel : undefined}
      className={cn(
        'relative inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0',
        'bg-slate-200 dark:bg-slate-700',
        sizeClasses[size],
        className
      )}
    >
      {src ? (
        <Image src={src} alt={alt || ''} fill className="object-cover" sizes="48px" />
      ) : initials ? (
        <span className="flex items-center justify-center w-full h-full text-slate-600 dark:text-slate-300 font-medium">
          {initials}
        </span>
      ) : (
        <svg
          aria-hidden="true"
          className="w-5 h-5 text-slate-400 dark:text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      )}
    </span>
  )
}
