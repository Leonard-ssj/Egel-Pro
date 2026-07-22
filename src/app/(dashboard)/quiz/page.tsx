import type { Metadata } from 'next'
import { Sparkles } from 'lucide-react'
import { AuroraBackground } from '@/components/ui/aurora-background'
import { SparklesText } from '@/components/ui/sparkles-text'
import { StartQuizForm } from '@/modules/quiz/components/StartQuizForm'
import { ResumeQuizBanner } from '@/modules/quiz/components/ResumeQuizBanner'
import { RealtimeRefresh } from '@/components/shared/RealtimeRefresh'
import { AreaCoverage } from '@/modules/quiz/components/AreaCoverage'
import { OfflineDownloadCard } from '@/modules/quiz/components/OfflineDownloadCard'
import { WeakAreasButton } from '@/modules/quiz/components/WeakAreasButton'
import {
  getActiveQuizSession,
  cleanupEmptyInProgressSessions,
} from '@/modules/quiz/actions'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Practicar' }

type AvailableCounts = {
  disciplinar: Record<number, number>
  transversal: Record<number, number>
}

async function getAvailableCounts(): Promise<AvailableCounts> {
  const supabase = await createClient()
  const disciplinar: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  const transversal: Record<number, number> = { 1: 0, 2: 0 }
  // Paginar: PostgREST corta en 1000 filas por defecto, y el banco tiene >1000
  // activas. Sin paginar, el conteo del banco salia mal (1000 en vez de ~1238).
  const PAGE = 1000
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('questions')
      .select('section, area')
      .eq('is_deleted', false)
      .eq('is_active', true)
      .range(from, from + PAGE - 1)
    if (error || !data || data.length === 0) break
    for (const row of data) {
      if (row.section === 'disciplinar') {
        disciplinar[row.area] = (disciplinar[row.area] ?? 0) + 1
      } else if (row.section === 'transversal') {
        transversal[row.area] = (transversal[row.area] ?? 0) + 1
      }
    }
    if (data.length < PAGE) break
    from += PAGE
  }
  return { disciplinar, transversal }
}

type SeenBreakdown = {
  total: number
  disciplinar: Record<number, number>
  transversal: Record<number, number>
}

/**
 * Cuenta las preguntas DISTINTAS que el user ha visto, total y POR AREA (join a
 * questions para saber section/area). Alimenta el banner global "Has visto X de Y"
 * y los KPIs de cobertura por area en /quiz.
 */
async function getUserSeen(userId: string): Promise<SeenBreakdown> {
  const supabase = await createClient()
  const disciplinar: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  const transversal: Record<number, number> = { 1: 0, 2: 0 }

  const { data: sessions } = await supabase
    .from('quiz_sessions')
    .select('id')
    .eq('user_id', userId)
  const sessionIds = (sessions ?? []).map((s) => s.id)
  if (sessionIds.length === 0) return { total: 0, disciplinar, transversal }

  const seen = new Set<string>()
  let offset = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await supabase
      .from('quiz_answers')
      .select('question_id, questions ( section, area )')
      .in('session_id', sessionIds)
      .range(offset, offset + PAGE - 1)
    if (error || !data || data.length === 0) break
    for (const r of data) {
      if (!r.question_id || seen.has(r.question_id)) continue
      seen.add(r.question_id)
      const q = r.questions as unknown as { section: string; area: number } | null
      if (!q) continue
      if (q.section === 'disciplinar' && disciplinar[q.area] !== undefined) disciplinar[q.area]++
      else if (q.section === 'transversal' && transversal[q.area] !== undefined) transversal[q.area]++
    }
    if (data.length < PAGE) break
    offset += PAGE
  }
  return { total: seen.size, disciplinar, transversal }
}

export default async function QuizPage() {
  // Cleanup silencioso de sesiones zombi antes de cargar el form
  await cleanupEmptyInProgressSessions()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const emptySeen: SeenBreakdown = { total: 0, disciplinar: { 1: 0, 2: 0, 3: 0, 4: 0 }, transversal: { 1: 0, 2: 0 } }
  const [availableCounts, activeRes, seen] = await Promise.all([
    getAvailableCounts(),
    getActiveQuizSession(),
    user ? getUserSeen(user.id) : Promise.resolve(emptySeen),
  ])
  const seenCount = seen.total
  const activeSession = activeRes.success ? activeRes.data : null
  const totalDisciplinar = Object.values(availableCounts.disciplinar).reduce((s, n) => s + n, 0)
  const totalTransversal = Object.values(availableCounts.transversal).reduce((s, n) => s + n, 0)
  const totalBank = totalDisciplinar + totalTransversal
  const unseenCount = Math.max(0, totalBank - seenCount)
  const seenPct = totalBank > 0 ? Math.round((seenCount / totalBank) * 100) : 0
  return (
    <div className="relative">
      {/* Refresca /quiz en vivo cuando cambia el avance en otro dispositivo. */}
      <RealtimeRefresh channel="quiz" />
      <AuroraBackground variant="subtle" className="absolute inset-0 -z-10">
        <div className="h-full w-full" />
      </AuroraBackground>

      <header className="mb-8 space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-glass-border/40 bg-glass-bg/40 px-3 py-1 text-xs font-medium text-aurora-2 backdrop-blur-md">
          <Sparkles className="h-3 w-3" />
          Modo entrenamiento
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-display-md lg:text-display-lg">
          <SparklesText className="text-aurora">Practicar</SparklesText>
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Elige un modo y comienza a entrenar para el EGEL. Cada quiz suma XP, mantiene tu racha y te acerca a tu meta.
        </p>
        <p className="text-xs text-muted-foreground/70">
          Banco completo: <span className="font-semibold text-aurora-2">{totalBank.toLocaleString('es-MX')}</span> reactivos
          {' '}<span className="text-muted-foreground/50">({totalDisciplinar.toLocaleString('es-MX')} disciplinares + {totalTransversal.toLocaleString('es-MX')} transversales)</span>
        </p>
      </header>

      {/* Banner: progreso de exploracion del banco */}
      {user && totalBank > 0 ? (
        <div className="mb-6 rounded-2xl border border-aurora-2/30 bg-aurora-2/5 p-4 backdrop-blur-md">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm">
              Has visto <span className="font-semibold text-aurora-2">{seenCount.toLocaleString('es-MX')}</span> de <span className="font-semibold">{totalBank.toLocaleString('es-MX')}</span> preguntas
              {' '}<span className="text-muted-foreground">({seenPct}%)</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Te quedan <span className="font-semibold text-foreground">{unseenCount.toLocaleString('es-MX')}</span> sin tomar — tu proximo quiz las prioriza
            </p>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-raised/60">
            <div
              className="h-full bg-gradient-to-r from-aurora-1 via-aurora-2 to-aurora-3 transition-all"
              style={{ width: `${seenPct}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* KPIs de cobertura por area (contestadas / total del banco / %) */}
      {user && totalBank > 0 ? (
        <AreaCoverage available={availableCounts} seen={seen} />
      ) : null}

      {/* Atajo: practica enfocada en areas debiles */}
      {user ? (
        <div className="mb-4">
          <WeakAreasButton />
        </div>
      ) : null}

      {/* Descargar banco para uso offline */}
      <div className="mb-6">
        <OfflineDownloadCard />
      </div>

      {activeSession ? (
        <ResumeQuizBanner
          sessionId={activeSession.sessionId}
          mode={activeSession.mode}
          totalQuestions={activeSession.totalQuestions}
          answeredCount={activeSession.answeredCount}
          startedAt={activeSession.startedAt}
        />
      ) : null}

      <StartQuizForm availableCounts={availableCounts} unseenCount={unseenCount} />
    </div>
  )
}
