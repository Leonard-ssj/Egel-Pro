'use client'

import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/glass-card'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils/cn'
import { getPerformanceLevel } from '@/lib/constants/egel'

// Etiqueta y color del nivel de desempeno oficial CENEVAL por area.
const LEVEL_META = {
  sobresaliente: { label: 'Sobresaliente', className: 'bg-success/15 text-success border-success/40' },
  satisfactorio: { label: 'Satisfactorio', className: 'bg-warning/15 text-warning border-warning/40' },
  ans: { label: 'Aun no satisfactorio', className: 'bg-danger/15 text-danger border-danger/40' },
} as const

export type AreaBreakdownRow = {
  area: number
  areaShortName: string
  attempted: number
  correct: number
  accuracy: number
}

type AreaBreakdownProps = {
  rows: AreaBreakdownRow[]
}

const AREA_COLOR: Record<number, string> = {
  1: 'bg-area1 text-area1',
  2: 'bg-area2 text-area2',
  3: 'bg-area3 text-area3',
  4: 'bg-area4 text-area4',
}

export function AreaBreakdown({ rows }: AreaBreakdownProps) {
  if (rows.length === 0) {
    return (
      <GlassCard variant="elevated" padding="lg">
        <h3 className="mb-2 text-lg font-semibold">Desempeno por area</h3>
        <p className="text-sm text-muted-foreground">
          Las metricas por area apareceran cuando hayas contestado al menos una pregunta.
        </p>
      </GlassCard>
    )
  }

  const data = rows.map((r) => ({
    subject: `A${r.area}`,
    accuracy: r.accuracy,
    fullName: r.areaShortName,
  }))

  return (
    <GlassCard variant="elevated" padding="lg">
      <h3 className="mb-4 text-lg font-semibold">Desempeno por area</h3>
      <div className="grid gap-6 md:grid-cols-2 md:items-center">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data}>
              <defs>
                <linearGradient
                  id="radar-aurora"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="hsl(225 100% 68%)" />
                  <stop offset="50%" stopColor="hsl(278 100% 71%)" />
                  <stop offset="100%" stopColor="hsl(340 100% 71%)" />
                </linearGradient>
              </defs>
              <PolarGrid stroke="hsl(232 28% 25%)" />
              <PolarAngleAxis
                dataKey="subject"
                stroke="hsl(220 10% 65%)"
                tick={{ fontSize: 12, fontWeight: 600 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                stroke="hsl(220 10% 65%)"
                tick={{ fontSize: 10 }}
              />
              <Radar
                name="Precision"
                dataKey="accuracy"
                stroke="url(#radar-aurora)"
                strokeWidth={2}
                fill="hsl(278 100% 71%)"
                fillOpacity={0.3}
              />
              <RechartsTooltip
                contentStyle={{
                  background: 'hsl(232 50% 9%)',
                  border: '1px solid hsl(232 50% 30% / 0.4)',
                  borderRadius: 10,
                  color: 'hsl(220 14% 96%)',
                  backdropFilter: 'blur(24px)',
                  boxShadow: '0 16px 48px -12px hsl(260 80% 20% / 0.35)',
                }}
                labelStyle={{ color: 'hsl(220 10% 65%)' }}
                formatter={(value: number) => [`${value}%`, 'Precision']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <TooltipProvider delayDuration={150}>
          <ul className="space-y-2">
            {rows.map((r, i) => {
              const colorClass = AREA_COLOR[r.area] ?? 'bg-bg-raised text-foreground'
              const [bgClass, textClass] = colorClass.split(' ')
              return (
                <motion.li
                  key={r.area}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: i * 0.06,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-glass-border/30 bg-glass-bg/40 px-4 py-3 text-sm backdrop-blur-md transition-all hover:border-brand-400/40 hover:shadow-glow-brand">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-white',
                              bgClass,
                            )}
                          >
                            A{r.area}
                          </span>
                          <div>
                            <p className="font-medium">{r.areaShortName}</p>
                            <p className="text-xs text-muted-foreground">
                              {r.correct} de {r.attempted} correctas
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'hidden shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:inline-block',
                              LEVEL_META[getPerformanceLevel(r.accuracy)].className,
                            )}
                          >
                            {LEVEL_META[getPerformanceLevel(r.accuracy)].label}
                          </span>
                          <span
                            className={cn(
                              'font-mono text-base font-bold tabular-nums',
                              textClass,
                            )}
                          >
                            <AnimatedCounter value={r.accuracy} suffix="%" />
                          </span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p className="font-medium">
                        Area {r.area} · {r.areaShortName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Precision: {r.accuracy}% · {LEVEL_META[getPerformanceLevel(r.accuracy)].label}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </motion.li>
              )
            })}
          </ul>
        </TooltipProvider>
      </div>
    </GlassCard>
  )
}
