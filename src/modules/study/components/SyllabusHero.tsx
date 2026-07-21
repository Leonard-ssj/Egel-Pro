'use client'

import { RotateCcw } from 'lucide-react'
import { GlassCard } from '@/components/ui/glass-card'
import { ProgressDonut } from './ProgressDonut'
import { areaProgress, type AreaNode } from '@/modules/study/lib/syllabus'
import { styleFor } from './syllabus-styles'
import { cn } from '@/lib/utils/cn'
import { EXAM_CONFIG } from '@/lib/constants/egel'

type SyllabusHeroProps = {
  tree: AreaNode[]
  mastered: Set<string>
  totalConcepts: number
  onReset: () => void
}

export function SyllabusHero({ tree, mastered, totalConcepts, onReset }: SyllabusHeroProps) {
  const totalSubareas = tree.reduce((s, a) => s + a.subareas.length, 0)
  const doneCount = tree.reduce((acc, a) => acc + areaProgress(a, mastered).done, 0)
  const globalPct = totalConcepts ? Math.round((doneCount / totalConcepts) * 100) : 0

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      {/* Izquierda: intro + facts + anillo */}
      <GlassCard variant="elevated" padding="lg" className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex-1 space-y-3">
          <p className="max-w-prose text-sm text-muted-foreground">
            Todo lo que puede caer en el examen: <b className="text-foreground">6 áreas</b>,{' '}
            <b className="text-foreground">{totalSubareas} subáreas</b> y{' '}
            <b className="text-foreground">{totalConcepts}</b> conceptos clave. Marca lo que ya
            dominas — tu avance se guarda en tu cuenta.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Fact value={totalConcepts} label="Conceptos" />
            <Fact value={doneCount} label="Dominados" accent />
            <Fact value={totalSubareas} label="Subáreas" />
            <Fact value={EXAM_CONFIG.totalQuestions} label="Reactivos" />
          </div>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-glass-border/40 bg-glass-bg/40 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-md transition-colors hover:border-danger/40 hover:text-danger"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reiniciar avance
          </button>
        </div>
        <div className="flex shrink-0 justify-center">
          <ProgressDonut percent={globalPct} size={132} strokeWidth={11} label="dominado" />
        </div>
      </GlassCard>

      {/* Derecha: barras por área */}
      <GlassCard variant="elevated" padding="lg">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Progreso por área
        </h3>
        <ul className="space-y-2.5">
          {tree.map((area) => {
            const { pct } = areaProgress(area, mastered)
            const st = styleFor(area.colorClass)
            return (
              <li key={area.key} className="flex items-center gap-3">
                <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', st.dot)} />
                <span className="w-28 shrink-0 truncate text-xs font-medium" title={area.name}>
                  {shortName(area)}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-bg-raised/60">
                  <span
                    className={cn('block h-full rounded-full transition-all duration-700', st.fill)}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className={cn('w-9 shrink-0 text-right font-mono text-xs font-bold', st.text)}>
                  {pct}%
                </span>
              </li>
            )
          })}
        </ul>
      </GlassCard>
    </div>
  )
}

function shortName(area: AreaNode): string {
  const prefix = area.section === 'disciplinar' ? `${area.area}. ` : 'T. '
  const name = area.name
    .replace('de Sistemas de Software', '')
    .replace('de Proyectos de Software', 'Proyectos')
    .trim()
  return `${prefix}${name}`
}

function Fact({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-glass-border/30 bg-glass-bg/40 p-2.5 backdrop-blur-md">
      <p className={cn('font-mono text-xl font-bold tabular-nums', accent ? 'text-success' : 'text-foreground')}>
        {value}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  )
}
