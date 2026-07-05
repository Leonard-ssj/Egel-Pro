'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import { MermaidDiagram } from '@/components/ui/MermaidDiagram'
import type { QuizQuestionForClient } from '@/modules/quiz/types'

type QuestionDisplayProps = {
  question: QuizQuestionForClient
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Facil',
  medium: 'Media',
  hard: 'Dificil',
}

const DIFFICULTY_VARIANT: Record<string, 'success' | 'warning' | 'destructive'> = {
  easy: 'success',
  medium: 'warning',
  hard: 'destructive',
}

const AREA_BADGE: Record<number, string> = {
  1: 'bg-area1/15 text-area1 border-area1/40',
  2: 'bg-area2/15 text-area2 border-area2/40',
  3: 'bg-area3/15 text-area3 border-area3/40',
  4: 'bg-area4/15 text-area4 border-area4/40',
}

// Convencion de contenido: si question_text arranca con "CASO:", el bloque
// de contexto (4-8 renglones estilo CENEVAL) se separa visualmente de la
// pregunta concreta que viene despues de la primera linea en blanco.
// Preguntas sin este marcador (banco legacy) se renderizan igual que antes.
function splitCaso(text: string): { caso: string | null; pregunta: string } {
  const match = text.match(/^\s*CASO:\s*\n([\s\S]+?)\n\s*\n([\s\S]+)$/i)
  if (!match) return { caso: null, pregunta: text }
  return { caso: match[1].trim(), pregunta: match[2].trim() }
}

export function QuestionDisplay({ question }: QuestionDisplayProps) {
  const difficulty = question.difficulty ?? 'medium'
  const areaClass = AREA_BADGE[question.area] ?? 'bg-bg-raised text-muted-foreground border-bg-border'
  const { caso, pregunta } = splitCaso(question.question_text)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold backdrop-blur-md',
            areaClass,
          )}
        >
          Area {question.area}
          {question.area_name ? ` — ${question.area_name}` : ''}
        </span>
        {question.subarea_name && (
          <span className="inline-flex items-center rounded-full border border-bg-border/60 bg-bg-raised/40 px-2.5 py-0.5 text-xs font-medium text-foreground/80 backdrop-blur-md">
            Tema: {question.subarea_name}
          </span>
        )}
        <Badge variant={DIFFICULTY_VARIANT[difficulty] ?? 'secondary'}>
          {DIFFICULTY_LABEL[difficulty] ?? difficulty}
        </Badge>
      </div>
      {caso ? (
        <div className="rounded-lg border border-bg-border/60 bg-bg-raised/40 p-4">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Caso
          </span>
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90 sm:text-base">
            {caso}
          </p>
        </div>
      ) : null}
      <h2 className="text-base font-medium leading-relaxed sm:text-lg md:text-xl lg:text-2xl">
        {pregunta}
      </h2>
      {question.diagram ? <MermaidDiagram chart={question.diagram} /> : null}
      {question.image_url ? (
        <div className="overflow-hidden rounded-lg border border-bg-border/40 bg-bg-raised/40">
          {/* Imagen del enunciado (UML, diagrama, tabla). Usamos img normal para
              evitar dependencia de remotePatterns por dominio externo arbitrario. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={question.image_url}
            alt=""
            className="max-h-[400px] w-full object-contain"
            loading="lazy"
          />
        </div>
      ) : null}
    </div>
  )
}
