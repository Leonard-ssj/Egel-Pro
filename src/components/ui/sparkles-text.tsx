'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

type Sparkle = { id: number; x: number; y: number; size: number; delay: number; duration: number }

type Props = {
  children: React.ReactNode
  className?: string
  /** Cantidad de sparkles. Default 8 */
  count?: number
  /** Colores. Default aurora gradient */
  colors?: string[]
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

export function SparklesText({
  children,
  className,
  count = 8,
  colors = ['hsl(var(--aurora-1))', 'hsl(var(--aurora-2))', 'hsl(var(--aurora-3))', 'hsl(var(--xp))'],
}: Props) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([])

  useEffect(() => {
    // Las chispas animan en bucle con framer (JS en el main-thread). En moviles
    // (tactil) o con "reducir movimiento" no las montamos: consumen bateria y
    // calientan el equipo. El texto con gradient se conserva igual.
    const noMotion =
      typeof window !== 'undefined' &&
      (window.matchMedia('(pointer: coarse)').matches ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    if (noMotion) {
      setSparkles([])
      return
    }
    const initial = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: rand(0, 100),
      y: rand(0, 100),
      size: rand(4, 10),
      delay: rand(0, 2),
      duration: rand(1.5, 3),
    }))
    setSparkles(initial)
  }, [count])

  return (
    <span className="relative inline-block">
      {/* Texto base. La className (p. ej. "text-aurora") va AQUI, sobre el span que
          contiene el texto: background-clip:text necesita estar en el mismo elemento
          que los glifos, si no el texto hereda color:transparent y queda invisible. */}
      <span className={cn('relative z-10', className)}>{children}</span>

      {/* Sparkles flotando alrededor */}
      <span aria-hidden className="pointer-events-none absolute -inset-4">
        {sparkles.map((s, idx) => {
          const color = colors[idx % colors.length]
          return (
            <motion.svg
              key={s.id}
              className="absolute"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: s.size,
                height: s.size,
                color,
              }}
              viewBox="0 0 24 24"
              initial={{ scale: 0, rotate: 0, opacity: 0 }}
              animate={{
                scale: [0, 1, 0],
                rotate: [0, 90, 180],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: s.duration,
                delay: s.delay,
                repeat: Infinity,
                repeatDelay: rand(2, 5),
                ease: 'easeInOut',
              }}
            >
              <path
                fill="currentColor"
                d="M12 0L13.5 8.5L22 10L13.5 11.5L12 20L10.5 11.5L2 10L10.5 8.5L12 0Z"
              />
            </motion.svg>
          )
        })}
      </span>
    </span>
  )
}
