import { DISCIPLINAR_AREAS, TRANSVERSAL_AREAS } from '@/lib/constants/egel'
import { cn } from '@/lib/utils/cn'
import { PracticeAreaButton } from './PracticeAreaButton'

type Counts = { disciplinar: Record<number, number>; transversal: Record<number, number> }

type AreaCoverageProps = {
  /** Total del banco por area (preguntas activas disponibles). */
  available: Counts
  /** Preguntas distintas ya vistas por el user, por area. */
  seen: Counts
}

type Row = {
  key: string
  section: 'disciplinar' | 'transversal'
  area: number
  label: string
  short: string
  seen: number
  total: number
  colorClass: string
}

// Estilos por color (clases completas para que Tailwind no las purgue).
const STYLES: Record<string, { text: string; dot: string; fill: string; border: string; bg: string }> = {
  area1: { text: 'text-area1', dot: 'bg-area1', fill: 'bg-area1', border: 'border-area1/40', bg: 'bg-area1/5' },
  area2: { text: 'text-area2', dot: 'bg-area2', fill: 'bg-area2', border: 'border-area2/40', bg: 'bg-area2/5' },
  area3: { text: 'text-area3', dot: 'bg-area3', fill: 'bg-area3', border: 'border-area3/40', bg: 'bg-area3/5' },
  area4: { text: 'text-area4', dot: 'bg-area4', fill: 'bg-area4', border: 'border-area4/40', bg: 'bg-area4/5' },
  accent: { text: 'text-accent-400', dot: 'bg-accent-400', fill: 'bg-accent-400', border: 'border-accent-400/40', bg: 'bg-accent-400/5' },
  brand: { text: 'text-brand-400', dot: 'bg-brand-400', fill: 'bg-brand-400', border: 'border-brand-400/40', bg: 'bg-brand-400/5' },
}

/**
 * KPIs de cobertura por area en /quiz: cuantas preguntas del banco ha visto el
 * user de cada area y el porcentaje. Sirve para saber que contenido falta por
 * recorrer. Se actualiza en vivo (el server component se refresca por realtime).
 */
export function AreaCoverage({ available, seen }: AreaCoverageProps) {
  const rows: Row[] = [
    ...DISCIPLINAR_AREAS.map((a) => ({
      key: `d${a.area}`,
      section: 'disciplinar' as const,
      area: a.area,
      label: a.name,
      short: `Área ${a.area}`,
      seen: seen.disciplinar[a.area] ?? 0,
      total: available.disciplinar[a.area] ?? 0,
      colorClass: `area${a.area}`,
    })),
    ...TRANSVERSAL_AREAS.map((a) => ({
      key: `t${a.area}`,
      section: 'transversal' as const,
      area: a.area,
      label: a.name,
      short: 'Transversal',
      seen: seen.transversal[a.area] ?? 0,
      total: available.transversal[a.area] ?? 0,
      colorClass: a.area === 1 ? 'accent' : 'brand',
    })),
  ].filter((r) => r.total > 0)

  if (rows.length === 0) return null

  return (
    <section className="mb-6 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Cobertura por área</h2>
        <p className="text-xs text-muted-foreground">Preguntas vistas / total del banco</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => {
          const pct = r.total > 0 ? Math.round((r.seen / r.total) * 100) : 0
          const st = STYLES[r.colorClass] ?? STYLES.area1!
          return (
            <div
              key={r.key}
              className={cn(
                'rounded-2xl border p-4 backdrop-blur-md',
                st.border,
                st.bg,
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', st.dot)} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-tight" title={r.label}>
                      {r.short}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground" title={r.label}>
                      {r.label}
                    </p>
                  </div>
                </div>
                <span className={cn('shrink-0 font-mono text-lg font-bold tabular-nums', st.text)}>
                  {pct}%
                </span>
              </div>
              <div className="mb-1.5 h-2 w-full overflow-hidden rounded-full bg-bg-raised/60">
                <div
                  className={cn('h-full rounded-full transition-all', st.fill)}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  <span className={cn('font-semibold', st.text)}>{r.seen.toLocaleString('es-MX')}</span>
                  {' '}de {r.total.toLocaleString('es-MX')} vistas
                  {' · '}
                  <span className="text-foreground/70">
                    {(r.total - r.seen).toLocaleString('es-MX')} por recorrer
                  </span>
                </p>
                <PracticeAreaButton
                  section={r.section}
                  area={r.area}
                  remaining={r.total - r.seen}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
