import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Map as MapIcon, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Dashboard' }
import { HeroSection } from '@/modules/dashboard/components/HeroSection'
import { LeaderboardMini } from '@/modules/dashboard/components/LeaderboardMini'
import { QuickStatsCard } from '@/modules/dashboard/components/QuickStatsCard'
import { WeakAreasCard, type WeakArea } from '@/modules/dashboard/components/WeakAreasCard'
import { RecentActivityCard, type RecentSession } from '@/modules/dashboard/components/RecentActivityCard'
import { TimelineCard, type TimelineDay } from '@/modules/dashboard/components/TimelineCard'
import { DailyChallengeCard } from '@/modules/dashboard/components/DailyChallengeCard'
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid'
import { DISCIPLINAR_AREAS } from '@/lib/constants/egel'

function buildLast7Days(streaks: Array<{ date: string; xp_earned: number | null; questions_answered: number | null }>): TimelineDay[] {
  const map = new Map(streaks.map((s) => [s.date, s]))
  const days: TimelineDay[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
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

function daysToExam(examDate: string | null): number | null {
  if (!examDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(examDate + 'T00:00:00')
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch en paralelo
  const todayISO = new Date().toISOString().slice(0, 10)
  const sevenDaysAgoISO = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return d.toISOString().slice(0, 10)
  })()

  const [
    profileRes,
    progressRes,
    recentSessionsRes,
    last7StreaksRes,
    todayStreakRes,
    completedCountRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('user_progress').select('*').eq('user_id', user.id),
    supabase
      .from('quiz_sessions')
      .select('id, mode, score_percent, estimated_level, xp_earned, finished_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('finished_at', { ascending: false })
      .limit(5),
    supabase
      .from('streaks')
      .select('date, xp_earned, questions_answered')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgoISO)
      .order('date', { ascending: true }),
    supabase
      .from('streaks')
      .select('daily_challenge_completed')
      .eq('user_id', user.id)
      .eq('date', todayISO)
      .maybeSingle(),
    // Conteo REAL de quizzes completados (no el de recientes, que esta topado a 5)
    supabase
      .from('quiz_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed'),
  ])

  const profile = profileRes.data
  const progress = progressRes.data ?? []

  // Cobertura del temario (mapa): conceptos dominados vs total.
  const [conceptTotalRes, conceptDoneRes] = await Promise.all([
    supabase
      .from('syllabus_concepts')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('user_concept_mastery')
      .select('concept_id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ])
  const conceptTotal = conceptTotalRes.count ?? 0
  const conceptDone = conceptDoneRes.count ?? 0
  const coveragePct = conceptTotal > 0 ? Math.round((conceptDone / conceptTotal) * 100) : 0

  // Stats agregados
  const totalQuestions = progress.reduce((acc, p) => acc + (p.questions_attempted ?? 0), 0)
  const totalCorrect = progress.reduce((acc, p) => acc + (p.questions_correct ?? 0), 0)
  const averageAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

  // Weak areas: tomar las 3 subareas con menor accuracy (que tengan al menos 1 intento)
  const weakAreas: WeakArea[] = progress
    .filter((p) => (p.questions_attempted ?? 0) > 0)
    .sort((a, b) => (a.accuracy_percent ?? 0) - (b.accuracy_percent ?? 0))
    .slice(0, 3)
    .map((p) => {
      const area = DISCIPLINAR_AREAS.find((da) => da.area === p.area)
      const sub = area?.subareas.find((s) => s.subarea === p.subarea)
      return {
        area: p.area,
        areaName: area?.name ?? `Area ${p.area}`,
        subarea: p.subarea,
        subareaName: sub?.name ?? `Subarea ${p.subarea}`,
        accuracy: Math.round(p.accuracy_percent ?? 0),
        attempted: p.questions_attempted ?? 0,
      }
    })

  const recentSessions: RecentSession[] = (recentSessionsRes.data ?? []).map((s) => ({
    id: s.id,
    mode: s.mode,
    scorePercent: s.score_percent ? Number(s.score_percent) : null,
    estimatedLevel: s.estimated_level,
    xpEarned: s.xp_earned,
    finishedAt: s.finished_at,
  }))

  const timelineDays = buildLast7Days(last7StreaksRes.data ?? [])

  return (
    <BentoGrid className="gap-4">
      {/* Hero — full row */}
      <BentoCard colSpan={6} padding="none" variant="flat" className="overflow-hidden border-glass-border/40 bg-transparent">
        <HeroSection
          fullName={profile?.full_name ?? null}
          email={profile?.email ?? user.email ?? ''}
          xpTotal={profile?.xp_total ?? 0}
          level={profile?.level ?? 1}
          streakCurrent={profile?.streak_current ?? 0}
          streakMax={profile?.streak_max ?? 0}
          daysToExam={daysToExam(profile?.exam_date ?? null)}
          lastActivityDate={profile?.last_activity_date ?? null}
        />
      </BentoCard>

      {/* Quick stats — full row */}
      <BentoCard colSpan={6} padding="none" variant="flat" className="border-none bg-transparent shadow-none">
        <QuickStatsCard
          totalQuestions={totalQuestions}
          averageAccuracy={averageAccuracy}
          totalQuizzes={completedCountRes.count ?? 0}
          bestStreak={profile?.streak_max ?? 0}
        />
      </BentoCard>

      {/* Recent activity — 4 cols x 2 rows */}
      <BentoCard colSpan={4} rowSpan={2} variant="elevated" padding="lg">
        <RecentActivityCard sessions={recentSessions} />
      </BentoCard>

      {/* Timeline — 2 cols */}
      <BentoCard colSpan={2} variant="elevated" padding="lg">
        <TimelineCard days={timelineDays} />
      </BentoCard>

      {/* Daily challenge — 3 cols */}
      <BentoCard colSpan={3} variant="elevated" padding="lg">
        <DailyChallengeCard completed={todayStreakRes.data?.daily_challenge_completed ?? false} />
      </BentoCard>

      {/* Weak areas — 3 cols */}
      <BentoCard colSpan={3} variant="elevated" padding="lg">
        <WeakAreasCard areas={weakAreas} />
      </BentoCard>

      {/* Cobertura del temario — 6 cols (full row) */}
      <BentoCard colSpan={6} variant="elevated" padding="lg">
        <Link href="/study/mapa" className="group flex flex-wrap items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-400/15 text-brand-400">
            <MapIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-semibold">
              Cobertura del temario
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </p>
            <p className="text-xs text-muted-foreground">
              Dominas <span className="font-semibold text-brand-400">{conceptDone}</span> de{' '}
              {conceptTotal} conceptos del examen
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-bg-raised/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-aurora-1 via-aurora-2 to-aurora-3 transition-all"
                style={{ width: `${coveragePct}%` }}
              />
            </div>
          </div>
          <span className="font-mono text-2xl font-bold tabular-nums text-brand-400">
            {coveragePct}%
          </span>
        </Link>
      </BentoCard>

      {/* Mini leaderboard — 6 cols (full row) */}
      <BentoCard colSpan={6} variant="elevated" padding="lg">
        <LeaderboardMini />
      </BentoCard>
    </BentoGrid>
  )
}
