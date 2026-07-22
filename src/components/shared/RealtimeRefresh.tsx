'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const DEFAULT_TABLES = [
  'quiz_answers',
  'quiz_sessions',
  'user_progress',
  'streaks',
] as const

type Props = {
  /** Tablas a escuchar. Por defecto las que afectan el avance del usuario. */
  tables?: readonly string[]
  /** Sufijo para el nombre del canal (evita choques si hay varios montados). */
  channel?: string
}

/**
 * Mantiene la pagina actualizada en vivo (sin recargar): cuando cambia el avance
 * del usuario en otro dispositivo/pestana (o al terminar un quiz), refresca el
 * server component. La RLS garantiza que solo lleguen cambios propios. Debounce
 * para no refrescar en cada tecla.
 */
export function RealtimeRefresh({ tables = DEFAULT_TABLES, channel = 'page' }: Props) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let timer: ReturnType<typeof setTimeout> | null = null
    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => router.refresh(), 800)
    }

    let ch = supabase.channel(`rt-refresh:${channel}`)
    for (const table of tables) {
      ch = ch.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        scheduleRefresh,
      )
    }
    ch.subscribe()

    return () => {
      if (timer) clearTimeout(timer)
      void supabase.removeChannel(ch)
    }
    // tables es estable en la practica (literal por pagina)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, channel])

  return null
}
