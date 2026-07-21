'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Check,
  ChevronDown,
  Search,
  Dumbbell,
  BookOpen,
  Loader2,
} from 'lucide-react'

import { GlassCard } from '@/components/ui/glass-card'
import { cn } from '@/lib/utils/cn'
import { fireConfetti } from '@/components/ui/confetti'
import { SyllabusHero } from './SyllabusHero'
import { styleFor } from './syllabus-styles'
import { areaProgress, type AreaNode, type SubareaNode } from '@/modules/study/lib/syllabus'
import {
  toggleConceptMastery,
  resetSyllabusProgress,
  startSubareaPractice,
} from '@/modules/study/syllabus-actions'

type Filter = 'all' | 'pending' | 'done'

type SyllabusMapProps = {
  tree: AreaNode[]
  initialMastered: string[]
  totalConcepts: number
}

export function SyllabusMap({ tree, initialMastered, totalConcepts }: SyllabusMapProps) {
  const [mastered, setMastered] = useState<Set<string>>(() => new Set(initialMastered))
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())

  const term = search.trim().toLowerCase()

  function matchesConcept(id: string, label: string): boolean {
    const isDone = mastered.has(id)
    const matchText = !term || label.toLowerCase().includes(term)
    const matchFilter =
      filter === 'all' || (filter === 'done' && isDone) || (filter === 'pending' && !isDone)
    return matchText && matchFilter
  }

  async function toggle(conceptId: string) {
    const next = new Set(mastered)
    const willMaster = !next.has(conceptId)
    if (willMaster) next.add(conceptId)
    else next.delete(conceptId)
    setMastered(next)

    // Confetti al llegar al 100% global.
    if (willMaster && next.size === totalConcepts && totalConcepts > 0) {
      fireConfetti('perfectScore')
      toast.success('¡Marcaste todo el temario como dominado! 🎉')
    }

    const res = await toggleConceptMastery({ conceptId, mastered: willMaster })
    if (!res.success) {
      // Revertir en caso de error de red / permiso.
      setMastered((cur) => {
        const rollback = new Set(cur)
        if (willMaster) rollback.delete(conceptId)
        else rollback.add(conceptId)
        return rollback
      })
      toast.error(res.error)
    }
  }

  function toggleCollapse(key: string) {
    setCollapsed((cur) => {
      const next = new Set(cur)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleReset() {
    if (!window.confirm('¿Borrar todo tu avance del mapa? Esta acción no se puede deshacer.')) return
    const prev = mastered
    setMastered(new Set())
    const res = await resetSyllabusProgress()
    if (!res.success) {
      setMastered(prev)
      toast.error(res.error)
    } else {
      toast.success('Avance reiniciado')
    }
  }

  return (
    <div className="space-y-6">
      <SyllabusHero
        tree={tree}
        mastered={mastered}
        totalConcepts={totalConcepts}
        onReset={handleReset}
      />

      {/* Toolbar: búsqueda + filtro */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tema o concepto…"
            className="w-full rounded-xl border border-glass-border/40 bg-glass-bg/40 py-2.5 pl-9 pr-3 text-sm backdrop-blur-md outline-none transition-colors focus:border-brand-400/60"
            data-testid="syllabus-search"
          />
        </div>
        <div className="flex gap-1 rounded-xl border border-glass-border/40 bg-glass-bg/40 p-1 backdrop-blur-md">
          {(['all', 'pending', 'done'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                filter === f ? 'bg-bg-raised text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendientes' : 'Dominados'}
            </button>
          ))}
        </div>
      </div>

      {/* Áreas */}
      <div className="space-y-4">
        {tree.map((area) => (
          <AreaCard
            key={area.key}
            area={area}
            mastered={mastered}
            collapsed={collapsed.has(area.key)}
            forceOpen={Boolean(term) || filter !== 'all'}
            onToggleCollapse={() => toggleCollapse(area.key)}
            onToggleConcept={toggle}
            matchesConcept={matchesConcept}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function AreaCard({
  area,
  mastered,
  collapsed,
  forceOpen,
  onToggleCollapse,
  onToggleConcept,
  matchesConcept,
}: {
  area: AreaNode
  mastered: Set<string>
  collapsed: boolean
  forceOpen: boolean
  onToggleCollapse: () => void
  onToggleConcept: (id: string) => void
  matchesConcept: (id: string, label: string) => boolean
}) {
  const st = styleFor(area.colorClass)
  const { pct, done, total } = areaProgress(area, mastered)

  // Subáreas visibles según búsqueda/filtro.
  const visibleSubs = area.subareas
    .map((sub) => ({
      sub,
      concepts: sub.concepts.filter((c) => matchesConcept(c.id, c.label)),
    }))
    .filter((x) => x.concepts.length > 0)

  if (visibleSubs.length === 0) return null
  const isOpen = forceOpen || !collapsed

  return (
    <GlassCard variant="elevated" padding="none" className={cn('overflow-hidden border-l-4', st.border)}>
      {/* Header */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex w-full items-center gap-3 px-4 py-4 text-left sm:px-5"
      >
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-black text-bg-base',
            st.dot,
          )}
        >
          {area.section === 'disciplinar' ? area.area : `T${area.area}`}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="flex flex-wrap items-center gap-2 text-sm font-bold sm:text-base">
            {area.name}
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', st.bg, st.text)}>
              {area.section === 'disciplinar' ? 'Disciplinar' : 'Transversal'}
            </span>
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {done}/{total} conceptos · {area.officialQuestions} reactivos oficiales
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden h-2 w-24 overflow-hidden rounded-full bg-bg-raised/60 sm:block">
            <span className={cn('block h-full rounded-full', st.fill)} style={{ width: `${pct}%` }} />
          </span>
          <span className={cn('w-9 text-right font-mono text-sm font-bold', st.text)}>{pct}%</span>
          <ChevronDown
            className={cn('h-5 w-5 text-muted-foreground transition-transform', !isOpen && '-rotate-90')}
          />
        </div>
      </button>

      {/* Body */}
      {isOpen ? (
        <div className="space-y-1 px-4 pb-4 sm:px-5">
          {visibleSubs.map(({ sub, concepts }) => (
            <SubareaBlock
              key={sub.key}
              sub={sub}
              concepts={concepts}
              colorClass={area.colorClass}
              mastered={mastered}
              onToggleConcept={onToggleConcept}
            />
          ))}
        </div>
      ) : null}
    </GlassCard>
  )
}

// ---------------------------------------------------------------------------

function SubareaBlock({
  sub,
  concepts,
  colorClass,
  mastered,
  onToggleConcept,
}: {
  sub: SubareaNode
  concepts: SubareaNode['concepts']
  colorClass: string
  mastered: Set<string>
  onToggleConcept: (id: string) => void
}) {
  const st = styleFor(colorClass)
  const router = useRouter()
  const [practicing, startPractice] = useTransition()

  function practice() {
    startPractice(async () => {
      const res = await startSubareaPractice({
        section: sub.section,
        area: sub.area,
        subarea: sub.subarea,
        totalQuestions: 15,
      })
      if (!res.success || !res.data) {
        toast.error(res.success ? 'No se pudo iniciar' : res.error)
        return
      }
      router.push(`/quiz/session/${res.data.sessionId}`)
    })
  }

  return (
    <div className="border-t border-dashed border-glass-border/40 py-3.5 first:border-t-0">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold">{sub.name}</h4>
        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', st.bg, st.text)}>
          {sub.officialQuestions} reactivos
        </span>
        <button
          type="button"
          onClick={practice}
          disabled={practicing}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-glass-border/40 bg-glass-bg/40 px-2.5 py-1 text-xs font-medium text-muted-foreground backdrop-blur-md transition-colors hover:border-brand-400/50 hover:text-brand-400 disabled:opacity-60"
          data-testid={`practice-${sub.key}`}
        >
          {practicing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Dumbbell className="h-3.5 w-3.5" />}
          Practicar
        </button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {concepts.map((c) => {
          const isDone = mastered.has(c.id)
          return (
            <li key={c.id} className="inline-flex items-center">
              <button
                type="button"
                onClick={() => onToggleConcept(c.id)}
                data-testid={`concept-${c.id}`}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                  isDone
                    ? cn(st.chipDone, 'text-muted-foreground')
                    : 'border-glass-border/40 bg-glass-bg/40 hover:-translate-y-px hover:border-brand-400/40',
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded border transition-colors',
                    isDone ? cn(st.dot, 'border-transparent') : 'border-muted-foreground/50',
                  )}
                >
                  {isDone ? <Check className="h-3 w-3 text-bg-base" strokeWidth={3.5} /> : null}
                </span>
                <span className={cn(isDone && 'line-through')}>{c.label}</span>
              </button>
              {c.guideSlug ? (
                <Link
                  href={`/study/${c.guideSlug}`}
                  className="ml-1 text-muted-foreground transition-colors hover:text-brand-400"
                  title="Ver en la guía"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
