import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Progreso' }
import { PageHeader } from '@/components/layout/PageHeader'
import { RealtimeRefresh } from '@/components/shared/RealtimeRefresh'
import { AuroraBackground } from '@/components/ui/aurora-background'
import { GlassCard } from '@/components/ui/glass-card'
import { MagicButton } from '@/components/ui/magic-button'
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid'
import {
  AreaRadar,
  type AreaRadarDatum,
  ActivityHeatmap,
  type HeatmapDay,
  SubareaBreakdown,
  type SubareaBreakdownRow,
  PredictionCard,
  CohortComparison,
} from '@/modules/progress/components'
import { DISCIPLINAR_AREAS, getAreaById, getSubareaById } from '@/lib/constants/egel'

export const dynamic = 'force-dynamic'

function buildLast90Days(
  streaks: Array<{ date: string; xp_earned: number | null; questions_answered: number | null }>,
): HeatmapDay[] {
  const map = new Map(streaks.map((s) => [s.date, s]))
  const days: HeatmapDay[] = []
  for (let i = 89; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const found = map.get(iso)
    days.push({
      date: iso,
      xpEarned: found?.xp_earned ?? 0,
      questionsAnswered: found?.questions_answered ?? 0,
    })
  }
  return days
}

/** Mapea goal_level del perfil a meta de precision para el radar. */
function goalFromProfile(goalLevel: string | null | undefined): number {
  if (goalLevel === 'sobresaliente') return 90
  if (goalLevel === 'satisfactorio') return 80
  return 70
}

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ninetyDaysAgoISO = (() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - 89)
    return d.toISOString().slice(0, 10)
  })()

  const [profileRes, progressRes, streaksRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('user_progress').select('*').eq('user_id', user.id),
    supabase
      .from('streaks')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', ninetyDaysAgoISO)
      .order('date', { ascending: true }),
  ])

  const profile = profileRes.data
  const progress = progressRes.data ?? []
  const streaks = streaksRes.data ?? []

  const totalAttempted = progress.reduce((acc, p) => acc + (p.questions_attempted ?? 0), 0)

  if (totalAttempted === 0) {
    return (
      <AuroraBackground
        variant="subtle"
        className="-mx-4 -mt-4 px-4 pt-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      >
        <div className="space-y-6">
          <PageHeader
            title="Tu progreso"
            description="Aqui veras tus analiticas detalladas conforme practiques"
            gradient
          />
          <GlassCard variant="elevated" padding="xl" className="text-center">
            <div className="flex flex-col items-center gap-3 py-8">
              <h2 className="text-display-sm font-bold">Aun no hay datos para mostrar</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Completa tu primer quiz para empezar a ver tu desempeno por area, tu mapa de
                actividad y tu prediccion para el examen.
              </p>
              <Link href="/quiz">
                <MagicButton variant="aurora" size="lg">
                  Empezar un quiz
                </MagicButton>
              </Link>
            </div>
          </GlassCard>
        </div>
      </AuroraBackground>
    )
  }

  const progressByArea = new Map<number, { attempted: number; correct: number }>()
  for (const p of progress) {
    const existing = progressByArea.get(p.area) ?? { attempted: 0, correct: 0 }
    existing.attempted += p.questions_attempted ?? 0
    existing.correct += p.questions_correct ?? 0
    progressByArea.set(p.area, existing)
  }

  const goal = goalFromProfile(profile?.goal_level)

  const radarData: AreaRadarDatum[] = DISCIPLINAR_AREAS.map((area) => {
    const agg = progressByArea.get(area.area)
    const accuracy =
      agg && agg.attempted > 0 ? Math.round((agg.correct / agg.attempted) * 100) : 0
    return {
      area: `A${area.area}`,
      accuracy,
      goal,
    }
  })

  const heatmapDays = buildLast90Days(streaks)

  const subareaRows: SubareaBreakdownRow[] = progress.map((p) => {
    const area = getAreaById(p.area, 'disciplinar') ?? getAreaById(p.area, 'transversal')
    const sub =
      getSubareaById(p.area, p.subarea, 'disciplinar') ??
      getSubareaById(p.area, p.subarea, 'transversal')
    return {
      area: p.area,
      areaName: area?.name ?? `Area ${p.area}`,
      subarea: p.subarea,
      subareaName: sub?.name ?? `Subarea ${p.subarea}`,
      accuracy: Math.round(p.accuracy_percent ?? 0),
      attempted: p.questions_attempted ?? 0,
      mastery: p.mastery_level ?? 'untouched',
    }
  })

  const totalCorrect = progress.reduce((acc, p) => acc + (p.questions_correct ?? 0), 0)
  const overallAccuracy =
    totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0

  let cohortAvg = 0
  let cohortSize = 0
  if (profile?.exam_date) {
    const examDate = new Date(profile.exam_date + 'T00:00:00')
    const from = new Date(examDate)
    from.setDate(examDate.getDate() - 30)
    const to = new Date(examDate)
    to.setDate(examDate.getDate() + 30)
    const fromISO = from.toISOString().slice(0, 10)
    const toISO = to.toISOString().slice(0, 10)

    const cohortRes = await supabase
      .from('user_progress')
      .select('user_id, questions_attempted, questions_correct, profiles!inner(exam_date)')
      .gte('profiles.exam_date', fromISO)
      .lte('profiles.exam_date', toISO)
      .neq('user_id', user.id)

    if (cohortRes.data) {
      const perUser = new Map<string, { attempted: number; correct: number }>()
      for (const row of cohortRes.data) {
        const existing = perUser.get(row.user_id) ?? { attempted: 0, correct: 0 }
        existing.attempted += row.questions_attempted ?? 0
        existing.correct += row.questions_correct ?? 0
        perUser.set(row.user_id, existing)
      }
      const accuracies = Array.from(perUser.values())
        .filter((u) => u.attempted > 0)
        .map((u) => (u.correct / u.attempted) * 100)
      cohortSize = accuracies.length
      cohortAvg =
        cohortSize > 0
          ? Math.round(accuracies.reduce((a, b) => a + b, 0) / cohortSize)
          : 0
    }
  }

  return (
    <AuroraBackground
      variant="subtle"
      className="-mx-4 -mt-4 px-4 pt-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      {/* Actualiza el progreso en vivo al terminar quizzes / cambiar el avance. */}
      <RealtimeRefresh channel="progress" />
      <PageHeader
        title="Tu progreso"
        description="Analiticas detalladas de tu preparacion para el EGEL Plus"
        gradient
        actions={
          <Link href="/quiz">
            <MagicButton variant="outline" size="md">
              Practicar mas
            </MagicButton>
          </Link>
        }
      />

      <BentoGrid>
        {/* Radar grande */}
        <BentoCard colSpan={4} rowSpan={2} variant="elevated" padding="lg">
          <AreaRadar data={radarData} />
        </BentoCard>

        {/* Prediction */}
        <BentoCard colSpan={2} variant="elevated" padding="lg">
          <PredictionCard overallAccuracy={overallAccuracy} totalAttempted={totalAttempted} />
        </BentoCard>

        {/* Cohort comparison */}
        <BentoCard colSpan={2} variant="elevated" padding="lg">
          <CohortComparison
            userPercent={overallAccuracy}
            cohortAvg={cohortAvg}
            cohortSize={cohortSize}
          />
        </BentoCard>

        {/* Heatmap full row */}
        <BentoCard colSpan={6} variant="elevated" padding="lg">
          <ActivityHeatmap days={heatmapDays} />
        </BentoCard>

        {/* Subarea breakdown full row */}
        <BentoCard colSpan={6} variant="elevated" padding="lg">
          <SubareaBreakdown rows={subareaRows} />
        </BentoCard>
      </BentoGrid>
    </AuroraBackground>
  )
}
