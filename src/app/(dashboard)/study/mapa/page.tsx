import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Map as MapIcon } from 'lucide-react'
import { AuroraBackground } from '@/components/ui/aurora-background'
import { SparklesText } from '@/components/ui/sparkles-text'
import { createClient } from '@/lib/supabase/server'
import { SyllabusMap } from '@/modules/study/components/SyllabusMap'
import { buildSyllabusTree, countConcepts, type SyllabusConceptRow } from '@/modules/study/lib/syllabus'

export const metadata: Metadata = { title: 'Mapa del temario' }

export default async function SyllabusMapPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [conceptsRes, masteryRes] = await Promise.all([
    supabase
      .from('syllabus_concepts')
      .select('id, section, area, subarea, label, guide_slug, sort_order')
      .eq('is_active', true)
      .order('section')
      .order('area')
      .order('subarea')
      .order('sort_order'),
    supabase.from('user_concept_mastery').select('concept_id').eq('user_id', user.id),
  ])

  const rows = (conceptsRes.data ?? []) as SyllabusConceptRow[]
  const tree = buildSyllabusTree(rows)
  const total = countConcepts(tree)
  const initialMastered = (masteryRes.data ?? []).map((r) => r.concept_id)

  return (
    <div className="relative">
      <AuroraBackground variant="subtle" className="absolute inset-0 -z-10">
        <div className="h-full w-full" />
      </AuroraBackground>

      <header className="mb-8 space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-glass-border/40 bg-glass-bg/40 px-3 py-1 text-xs font-medium text-aurora-2 backdrop-blur-md">
          <MapIcon className="h-3 w-3" />
          Temario completo · CENEVAL
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-display-md lg:text-display-lg">
          <SparklesText className="text-aurora">Mapa del temario</SparklesText>
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          El temario completo del EGEL Plus ISOFT. Marca los conceptos que ya dominas, encuentra
          tus huecos y practica cualquier subárea con un clic.
        </p>
      </header>

      {total > 0 ? (
        <SyllabusMap tree={tree} initialMastered={initialMastered} totalConcepts={total} />
      ) : (
        <p className="text-sm text-muted-foreground">
          El mapa del temario aún no tiene conceptos cargados.
        </p>
      )}
    </div>
  )
}
