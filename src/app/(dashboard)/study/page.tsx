import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, ArrowRight } from 'lucide-react'
import { AuroraBackground } from '@/components/ui/aurora-background'
import { GlassCard } from '@/components/ui/glass-card'
import { SparklesText } from '@/components/ui/sparkles-text'
import { createClient } from '@/lib/supabase/server'
import { ProgressDonut } from '@/modules/study/components/ProgressDonut'
import { AREA_KEYS } from '@/modules/study/lib/area-slugs'

export const metadata: Metadata = { title: 'Estudiar' }

type GuideRow = {
  id: string
  slug: string
  title: string
  section: string
  area_num: number
  subarea_num: number
  weight_in_exam: number | null
  estimated_minutes: number | null
}

export default async function StudyV2Hub() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [guidesRes, progressRes] = await Promise.all([
    supabase
      .from('guides')
      .select('id, slug, title, section, area_num, subarea_num, weight_in_exam, estimated_minutes')
      .eq('published', true)
      .order('section')
      .order('area_num')
      .order('subarea_num'),
    supabase
      .from('user_guide_progress')
      .select('guide_id, status, percent_read')
      .eq('user_id', user.id),
  ])

  const guides = (guidesRes.data ?? []) as GuideRow[]
  const progressByGuide = new Map<string, { status: string; percent_read: number }>()
  for (const p of progressRes.data ?? []) {
    progressByGuide.set(p.guide_id, { status: p.status ?? 'no_iniciado', percent_read: p.percent_read ?? 0 })
  }

  // Cobertura global
  const totalGuides = guides.length
  const completedGuides = guides.filter((g) => progressByGuide.get(g.id)?.status === 'completado').length
  const inProgressGuides = guides.filter((g) => progressByGuide.get(g.id)?.status === 'en_progreso').length
  const globalPercent = totalGuides > 0 ? Math.round((completedGuides / totalGuides) * 100) : 0

  // Agrupar por area
  const byArea = new Map<string, { area: typeof AREA_KEYS[number]; guides: GuideRow[] }>()
  for (const a of AREA_KEYS) {
    byArea.set(a.slug, { area: a, guides: [] })
  }
  for (const g of guides) {
    const areaKey = AREA_KEYS.find((a) => a.section === g.section && a.area_num === g.area_num)
    if (areaKey) {
      byArea.get(areaKey.slug)!.guides.push(g)
    }
  }

  return (
    <div className="relative">
      <AuroraBackground variant="subtle" className="absolute inset-0 -z-10">
        <div className="h-full w-full" />
      </AuroraBackground>

      <header className="mb-6 space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-glass-border/40 bg-glass-bg/40 px-3 py-1 text-xs font-medium text-aurora-2 backdrop-blur-md">
          <BookOpen className="h-3 w-3" />
          Estudiar — guias estructuradas
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-display-md lg:text-display-lg">
          <SparklesText className="text-aurora">Material de estudio</SparklesText>
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          19 guias completas del temario oficial EGEL Plus ISOFT — conceptos, ejemplos, diagramas, quick quiz y referencias por subarea.
        </p>
        <Link
          href="/study/uml"
          className="inline-flex items-center gap-1.5 rounded-full border border-aurora-2/40 bg-aurora-2/10 px-3 py-1 text-xs font-medium text-aurora-2 backdrop-blur-md transition-colors hover:bg-aurora-2/20"
        >
          <BookOpen className="h-3.5 w-3.5" /> Visualizador de diagramas UML
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          href="/study/flashcards-uml"
          className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-aurora-3/40 bg-aurora-3/10 px-3 py-1 text-xs font-medium text-aurora-3 backdrop-blur-md transition-colors hover:bg-aurora-3/20"
        >
          <BookOpen className="h-3.5 w-3.5" /> Flashcards UML
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          href="/study/flashcards-area3"
          className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-area3/40 bg-area3/10 px-3 py-1 text-xs font-medium text-area3 backdrop-blur-md transition-colors hover:bg-area3/20"
        >
          <BookOpen className="h-3.5 w-3.5" /> Flashcards Area 3
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      {/* Resumen global */}
      <GlassCard variant="elevated" padding="lg" className="mb-6">
        <div className="flex flex-wrap items-center gap-6">
          <ProgressDonut percent={globalPercent} size={120} label="completado" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-semibold">Cobertura global del temario</p>
            <p className="text-xs text-muted-foreground">
              {completedGuides} completadas · {inProgressGuides} en progreso · {totalGuides - completedGuides - inProgressGuides} sin iniciar
            </p>
            <p className="text-xs text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{totalGuides}</span> guias · cubren los 203 reactivos oficiales del EGEL
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Grid de areas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AREA_KEYS.map((area) => {
          const bucket = byArea.get(area.slug)!
          const total = bucket.guides.length
          const completed = bucket.guides.filter((g) => progressByGuide.get(g.id)?.status === 'completado').length
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0
          return (
            <Link
              key={area.slug}
              href={`/study/${area.slug}`}
              className="group flex flex-col gap-3 rounded-2xl border border-glass-border/40 bg-glass-bg/40 p-5 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-aurora-2/40"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-bold leading-tight">{area.name}</h3>
                <ProgressDonut percent={pct} size={56} strokeWidth={6} />
              </div>
              <p className="text-xs text-muted-foreground">
                {total} {total === 1 ? 'guia' : 'guias'} · {area.section === 'transversal' ? 'Transversal' : `Area ${area.area_num}`}
              </p>
              <span className="mt-auto inline-flex items-center gap-1 text-xs text-aurora-2 group-hover:underline">
                Ver guias <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
