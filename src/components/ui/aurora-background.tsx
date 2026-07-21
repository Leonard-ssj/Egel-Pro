'use client'

import { cn } from '@/lib/utils/cn'
import { useEffect, useState } from 'react'

type AuroraBackgroundProps = {
  variant?: 'subtle' | 'normal' | 'intense'
  className?: string
  children?: React.ReactNode
}

const VARIANT_OPACITY = {
  subtle:  { layer1: 0.15, layer2: 0.12, layer3: 0.08 },
  normal:  { layer1: 0.30, layer2: 0.25, layer3: 0.18 },
  intense: { layer1: 0.50, layer2: 0.40, layer3: 0.30 },
} as const

/**
 * Fondo aurora animado con gradient mesh.
 * 3 capas radial-gradient que se mueven en bucle creando un efecto orgnico.
 * Performance: usa transform GPU + se pausa cuando tab oculto.
 */
export function AuroraBackground({
  variant = 'normal',
  className,
  children,
}: AuroraBackgroundProps) {
  const opacity = VARIANT_OPACITY[variant]
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const onVisibility = () => setIsVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  return (
    <div className={cn('relative isolate overflow-hidden', className)}>
      {/* Layer 1 - aurora-1 (royal blue) */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -top-1/4 -left-1/4 h-[150%] w-[150%]',
          'rounded-full blur-3xl',
          isVisible && 'animate-aurora-shift',
        )}
        style={{
          background: `radial-gradient(circle, hsl(var(--aurora-1) / ${opacity.layer1}), transparent 60%)`,
          animationDelay: '0s',
        }}
      />
      {/* Layer 2 - aurora-2 (cosmic violet) */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -top-1/3 -right-1/4 h-[140%] w-[140%]',
          'rounded-full blur-3xl',
          isVisible && 'animate-aurora-shift',
        )}
        style={{
          background: `radial-gradient(circle, hsl(var(--aurora-2) / ${opacity.layer2}), transparent 60%)`,
          animationDelay: '-7s',
        }}
      />
      {/* Layer 3 - aurora-3 (nova pink) */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -bottom-1/4 left-1/3 h-[130%] w-[130%]',
          'rounded-full blur-3xl',
          isVisible && 'animate-aurora-shift',
        )}
        style={{
          background: `radial-gradient(circle, hsl(var(--aurora-3) / ${opacity.layer3}), transparent 60%)`,
          animationDelay: '-14s',
        }}
      />
      {/* Noise overlay para textura */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}
