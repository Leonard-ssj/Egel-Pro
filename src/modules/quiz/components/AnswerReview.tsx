'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, X, MinusCircle, ChevronDown } from 'lucide-react'
import { GlassCard } from '@/components/ui/glass-card'
import { cn } from '@/lib/utils/cn'
import { QuestionFeedbackChips } from './QuestionFeedbackChips'
import { OptionMedia } from './OptionMedia'

export type ReviewItem = {
  questionId: string
  questionText: string
  area: number
  subarea: number
  areaName?: string | null
  subareaName?: string | null
  optionA: string
  optionB: string
  optionC: string
  optionAImage?: string | null
  optionBImage?: string | null
  optionCImage?: string | null
  optionADiagram?: string | null
  optionBDiagram?: string | null
  optionCDiagram?: string | null
  correctAnswer: 'a' | 'b' | 'c'
  userAnswer: 'a' | 'b' | 'c' | null
  isCorrect: boolean | null
  explanation: string | null
  /** Razones de feedback de calidad que el usuario ya marco para esta pregunta. */
  feedbackReasons?: string[]
}

type AnswerReviewProps = {
  items: ReviewItem[]
}

export function AnswerReview({ items }: AnswerReviewProps) {
  if (items.length === 0) return null
  return (
    <GlassCard variant="elevated" padding="lg">
      <h3 className="mb-4 text-lg font-semibold">Revisar respuestas</h3>
      <div className="space-y-3">
        {items.map((item, i) => (
          <ReviewRow key={item.questionId} item={item} index={i + 1} />
        ))}
      </div>
    </GlassCard>
  )
}

function ReviewRow({ item, index }: { item: ReviewItem; index: number }) {
  const [open, setOpen] = useState(false)

  const options: Array<{
    label: 'a' | 'b' | 'c'
    text: string
    image?: string | null
    diagram?: string | null
  }> = [
    { label: 'a', text: item.optionA, image: item.optionAImage, diagram: item.optionADiagram },
    { label: 'b', text: item.optionB, image: item.optionBImage, diagram: item.optionBDiagram },
    { label: 'c', text: item.optionC, image: item.optionCImage, diagram: item.optionCDiagram },
  ]

  const status: 'skipped' | 'correct' | 'incorrect' =
    item.userAnswer === null
      ? 'skipped'
      : item.isCorrect
        ? 'correct'
        : 'incorrect'

  const STATUS_META = {
    correct: {
      icon: <Check className="h-4 w-4" strokeWidth={3} />,
      iconBg: 'bg-success/15 text-success ring-success/40 shadow-[0_0_16px_-4px_hsl(var(--success)/0.6)]',
      label: 'Correcta',
      labelClass: 'text-success',
    },
    incorrect: {
      icon: <X className="h-4 w-4" strokeWidth={3} />,
      iconBg: 'bg-danger/15 text-danger ring-danger/40 shadow-[0_0_16px_-4px_hsl(var(--danger)/0.6)]',
      label: 'Incorrecta',
      labelClass: 'text-danger',
    },
    skipped: {
      icon: <MinusCircle className="h-4 w-4" />,
      iconBg: 'bg-bg-raised/60 text-muted-foreground ring-bg-border/40',
      label: 'Saltada',
      labelClass: 'text-muted-foreground',
    },
  } as const

  const meta = STATUS_META[status]

  return (
    <div className="overflow-hidden rounded-xl border border-glass-border/30 bg-glass-bg/40 backdrop-blur-md transition-colors hover:border-glass-border/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <span
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1',
            meta.iconBg,
          )}
        >
          {meta.icon}
        </span>
        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono text-muted-foreground">#{index}</span>
            <span className="inline-flex items-center rounded-full border border-glass-border/40 bg-glass-bg/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-md">
              {item.areaName ? `A${item.area} · ${item.areaName}` : `A${item.area}.${item.subarea}`}
            </span>
            {item.subareaName && (
              <span className="text-[10px] font-medium text-muted-foreground">
                · {item.subareaName}
              </span>
            )}
            <span className={cn('font-semibold', meta.labelClass)}>
              {meta.label}
            </span>
          </div>
          <p className="text-sm font-medium leading-snug">
            {/* Preview de una linea: sin bloques de codigo (se condensan) ni backticks. */}
            {item.questionText
              .replace(/```[\s\S]*?```/g, ' «código» ')
              .replace(/`([^`]+)`/g, '$1')
              .replace(/\s+/g, ' ')
              .trim()}
          </p>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="mt-1 text-muted-foreground"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-glass-border/30 p-4">
              <ul className="space-y-2">
                {options.map((opt) => {
                  const isUser = opt.label === item.userAnswer
                  const isCorrectOpt = opt.label === item.correctAnswer
                  return (
                    <li
                      key={opt.label}
                      className={cn(
                        'flex items-start gap-3 rounded-lg border p-3 text-sm backdrop-blur-md',
                        isCorrectOpt
                          ? 'border-success/50 bg-success/10'
                          : isUser
                            ? 'border-danger/50 bg-danger/10'
                            : 'border-glass-border/30 bg-glass-bg/40',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase',
                          isCorrectOpt
                            ? 'bg-success text-bg-base'
                            : isUser
                              ? 'bg-danger text-bg-base'
                              : 'bg-bg-raised/80 text-muted-foreground',
                        )}
                      >
                        {opt.label}
                      </span>
                      <span className="min-w-0 flex-1 leading-relaxed">
                        {opt.text}
                        <OptionMedia image={opt.image} diagram={opt.diagram} />
                      </span>
                      {isCorrectOpt ? (
                        <span className="ml-auto text-xs font-medium text-success">
                          Correcta
                        </span>
                      ) : isUser ? (
                        <span className="ml-auto text-xs font-medium text-danger">
                          Tu respuesta
                        </span>
                      ) : null}
                    </li>
                  )
                })}
              </ul>

              {item.explanation ? (
                <div className="rounded-lg border border-glass-border/30 bg-bg-base/60 p-4 text-sm text-muted-foreground backdrop-blur-md">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-aurora-2">
                    Explicacion
                  </p>
                  <p className="leading-relaxed">{item.explanation}</p>
                </div>
              ) : null}

              <QuestionFeedbackChips
                questionId={item.questionId}
                initialReasons={item.feedbackReasons}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
