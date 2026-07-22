'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Mantiene la pantalla /quiz (Practicar) actualizada en vivo, sin recargar:
 * cuando el usuario responde/inicia/termina un quiz en OTRO dispositivo o
 * pestana, refresca el server component para actualizar el banner "quiz en
 * progreso" (X de Y respondidas) y el contador "Has visto X de Y".
 *
 * Escucha cambios de quiz_answers y quiz_sessions. La RLS garantiza que solo
 * lleguen filas propias, asi que no filtramos por id (queremos todas las del
 * usuario). Se hace debounce para no refrescar en cada tecla.
 */
export function QuizPageLiveRefresh() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let timer: ReturnType<typeof setTimeout> | null = null

    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => router.refresh(), 800)
    }

    const channel = supabase
      .channel('quiz-page-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_answers' },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_sessions' },
        scheduleRefresh,
      )
      .subscribe()

    return () => {
      if (timer) clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
