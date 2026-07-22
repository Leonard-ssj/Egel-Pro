'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Play } from 'lucide-react'
import { startAreaUnseenQuiz } from '@/modules/quiz/actions'
import { cn } from '@/lib/utils/cn'

type Props = {
  section: 'disciplinar' | 'transversal'
  area: number
  remaining: number
  className?: string
}

/**
 * Boton que arma un quiz SOLO con las preguntas que faltan (no vistas) de un
 * area concreta y navega a la sesion. Se usa en las tarjetas de cobertura.
 */
export function PracticeAreaButton({ section, area, remaining, className }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  if (remaining <= 0) return null

  function handleClick() {
    startTransition(async () => {
      const res = await startAreaUnseenQuiz({ section, area, totalQuestions: remaining })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      router.push(`/quiz/session/${res.data.sessionId}`)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-glass-border/50 bg-glass-bg/50 px-2.5 py-1 text-xs font-medium text-foreground/90 backdrop-blur-md transition-colors hover:border-brand-400/50 hover:text-brand-400 disabled:opacity-60',
        className,
      )}
      data-testid={`practice-remaining-${section}-${area}`}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
      Practicar faltantes
    </button>
  )
}
