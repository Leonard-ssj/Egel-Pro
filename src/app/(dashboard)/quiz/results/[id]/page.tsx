import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuroraBackground } from '@/components/ui/aurora-background'
import { MagicButton } from '@/components/ui/magic-button'
import { ResultsCard } from '@/modules/quiz/components/ResultsCard'
import { AreaBreakdown, type AreaBreakdownRow } from '@/modules/quiz/components/AreaBreakdown'
import { AnswerReview, type ReviewItem } from '@/modules/quiz/components/AnswerReview'
import { getMyQuestionFeedback } from '@/modules/quiz/feedback-actions'
import { DISCIPLINAR_AREAS } from '@/lib/constants/egel'
import type { PerformanceLevel, CorrectAnswer } from '@/types/global'

export const metadata: Metadata = { title: 'Resultados' }

type Params = { id: string }

type AnswerRow = {
  question_id: string
  user_answer: string | null
  is_correct: boolean | null
  is_marked: boolean | null
  order_in_quiz: number
  questions: {
    id: string
    question_text: string
    area: number
    area_name: string | null
    subarea: number
    subarea_name: string | null
    option_a: string
    option_b: string
    option_c: string
    option_a_image: string | null
    option_b_image: string | null
    option_c_image: string | null
    option_a_diagram: string | null
    option_b_diagram: string | null
    option_c_diagram: string | null
    correct_answer: string
    explanation: string | null
  } | null
}

export default async function ResultsPage({ params }: { params: Promise<Params> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session, error } = await supabase
    .from('quiz_sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !session) notFound()
  if (session.user_id !== user.id) notFound()
  if (session.status !== 'completed') {
    redirect(`/quiz/session/${id}`)
  }

  // Cargar respuestas + preguntas para construir el review y el breakdown
  const { data: rawAnswers } = await supabase
    .from('quiz_answers')
    .select(`
      question_id,
      user_answer,
      is_correct,
      is_marked,
      order_in_quiz,
      questions ( id, question_text, area, area_name, subarea, subarea_name, option_a, option_b, option_c, option_a_image, option_b_image, option_c_image, option_a_diagram, option_b_diagram, option_c_diagram, correct_answer, explanation )
    `)
    .eq('session_id', id)
    .order('order_in_quiz', { ascending: true })

  const answers = (rawAnswers ?? []) as unknown as AnswerRow[]

  // Feedback de calidad ya marcado por el usuario, para precargar los chips
  const reviewedQuestionIds = answers
    .filter((a) => a.questions)
    .map((a) => a.question_id)
  const feedbackMap = await getMyQuestionFeedback(reviewedQuestionIds)

  // Construir review items
  const reviewItems: ReviewItem[] = answers
    .filter((a): a is AnswerRow & { questions: NonNullable<AnswerRow['questions']> } => Boolean(a.questions))
    .map((a) => ({
      questionId: a.question_id,
      questionText: a.questions.question_text,
      area: a.questions.area,
      areaName: a.questions.area_name,
      subarea: a.questions.subarea,
      subareaName: a.questions.subarea_name,
      optionA: a.questions.option_a,
      optionB: a.questions.option_b,
      optionC: a.questions.option_c,
      optionAImage: a.questions.option_a_image,
      optionBImage: a.questions.option_b_image,
      optionCImage: a.questions.option_c_image,
      optionADiagram: a.questions.option_a_diagram,
      optionBDiagram: a.questions.option_b_diagram,
      optionCDiagram: a.questions.option_c_diagram,
      correctAnswer: a.questions.correct_answer as CorrectAnswer,
      userAnswer: (a.user_answer as CorrectAnswer | null) ?? null,
      isCorrect: a.is_correct,
      isMarked: Boolean(a.is_marked),
      explanation: a.questions.explanation,
      feedbackReasons: feedbackMap[a.question_id] ?? [],
    }))

  // Construir breakdown por area
  const buckets = new Map<number, { attempted: number; correct: number }>()
  for (const a of answers) {
    if (!a.questions) continue
    const b = buckets.get(a.questions.area) ?? { attempted: 0, correct: 0 }
    b.attempted++
    if (a.is_correct === true) b.correct++
    buckets.set(a.questions.area, b)
  }
  const breakdown: AreaBreakdownRow[] = Array.from(buckets.entries())
    .map(([area, { attempted, correct }]) => {
      const meta = DISCIPLINAR_AREAS.find((a) => a.area === area)
      return {
        area,
        areaShortName: meta?.name.split(' ')[0] ?? `Area ${area}`,
        attempted,
        correct,
        accuracy: attempted === 0 ? 0 : Math.round((correct / attempted) * 100),
      }
    })
    .sort((a, b) => a.area - b.area)

  const scorePercent = Number(session.score_percent ?? 0)
  const performanceLevel = (session.estimated_level ?? 'ans') as PerformanceLevel
  const correct = session.correct_answers ?? 0
  const total = session.total_questions
  const ratio = total > 0 ? correct / total : 0
  const auroraVariant: 'subtle' | 'normal' | 'intense' =
    ratio >= 0.95
      ? 'intense'
      : performanceLevel === 'sobresaliente'
        ? 'normal'
        : 'subtle'

  return (
    <div className="relative">
      <AuroraBackground variant={auroraVariant} className="absolute inset-0 -z-10">
        <div className="h-full w-full" />
      </AuroraBackground>

      <div className="mx-auto max-w-4xl space-y-6">
        <ResultsCard
          scorePercent={scorePercent}
          performanceLevel={performanceLevel}
          correct={correct}
          wrong={session.wrong_answers ?? 0}
          skipped={session.skipped ?? 0}
          total={total}
          xpEarned={session.xp_earned ?? 0}
          timeTakenSeconds={session.time_taken_seconds}
        />

        <AreaBreakdown rows={breakdown} />

        <AnswerReview items={reviewItems} />

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <MagicButton asChild variant="outline" size="lg">
            <Link href="/dashboard">Volver al dashboard</Link>
          </MagicButton>
          <MagicButton asChild variant="aurora" size="lg">
            <Link href="/quiz">Hacer otro quiz</Link>
          </MagicButton>
        </div>
      </div>
    </div>
  )
}
