'use client'

import {
  ChevronLeft,
  ChevronRight,
  Flag,
  SkipForward,
  Send,
  Loader2,
  XCircle,
  PauseCircle,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { MagicButton } from '@/components/ui/magic-button'
import { cn } from '@/lib/utils/cn'

type QuizControlsProps = {
  canPrev: boolean
  isLast: boolean
  isMarked: boolean
  isFinishing: boolean
  onPrev: () => void
  onNext: () => void
  onSkip: () => void
  onToggleMark: () => void
  onFinish: () => void
  onEndEarly?: () => void
  /** Pausar y salir (modo practica). Deja la sesion in_progress para retomar. */
  onPause?: () => void
  answeredCount?: number
  total?: number
}

export function QuizControls({
  canPrev,
  isLast,
  isMarked,
  isFinishing,
  onPrev,
  onNext,
  onSkip,
  onToggleMark,
  onFinish,
  onEndEarly,
  onPause,
  answeredCount,
  total,
}: QuizControlsProps) {
  function handleEndEarlyClick() {
    if (!onEndEarly) return
    const message =
      answeredCount !== undefined && total !== undefined
        ? `¿Terminar el quiz ahora? Veras el resultado sobre las ${answeredCount} preguntas contestadas (de ${total}).`
        : '¿Terminar el quiz ahora?'
    if (window.confirm(message)) onEndEarly()
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <MagicButton
          variant="ghost"
          size="md"
          onClick={onPrev}
          disabled={!canPrev || isFinishing}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </MagicButton>
        <MagicButton
          variant="ghost"
          size="md"
          onClick={onToggleMark}
          disabled={isFinishing}
          className={cn(isMarked && 'text-warning')}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={isMarked ? 'on' : 'off'}
              initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.6, rotate: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className="inline-flex items-center"
            >
              <Flag
                className={cn(
                  'mr-2 h-4 w-4',
                  isMarked && 'fill-warning text-warning',
                )}
              />
              {isMarked ? 'Marcada' : 'Marcar'}
            </motion.span>
          </AnimatePresence>
        </MagicButton>
      </div>

      <div className="flex items-center gap-2">
        {onPause ? (
          <MagicButton
            variant="ghost"
            size="md"
            onClick={onPause}
            disabled={isFinishing}
            className="text-muted-foreground hover:text-foreground"
          >
            <PauseCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Pausar</span>
          </MagicButton>
        ) : null}
        {onEndEarly ? (
          <MagicButton
            variant="ghost"
            size="md"
            onClick={handleEndEarlyClick}
            disabled={isFinishing}
            className="text-danger hover:text-danger"
          >
            <XCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Terminar ahora</span>
          </MagicButton>
        ) : null}
        {!isLast ? (
          <>
            <MagicButton
              variant="outline"
              size="md"
              onClick={onSkip}
              disabled={isFinishing}
            >
              <SkipForward className="h-4 w-4" />
              Saltar
            </MagicButton>
            <MagicButton
              variant="solid"
              size="md"
              onClick={onNext}
              disabled={isFinishing}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </MagicButton>
          </>
        ) : (
          <MagicButton
            variant="aurora"
            size="lg"
            onClick={onFinish}
            disabled={isFinishing}
          >
            {isFinishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Finalizar quiz
          </MagicButton>
        )}
      </div>
    </div>
  )
}
