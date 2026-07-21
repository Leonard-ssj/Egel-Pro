'use client'

import { useEffect, useRef, useState } from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'
import { flushQueue, queueSize } from '@/modules/quiz/lib/offline-queue'
import { submitAnswer } from '@/modules/quiz/actions'

/**
 * Banner fijo que aparece cuando el navegador pierde conexion o cuando hay
 * respuestas offline pendientes. Ademas se encarga de VACIAR la cola cuando hay
 * conexion (aunque el usuario no este dentro de un quiz), asi el indicador no
 * se queda atorado en "Sincronizando..." indefinidamente.
 */
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [pending, setPending] = useState(0)
  const flushingRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function syncNow() {
      if (cancelled || flushingRef.current) return
      if (typeof navigator !== 'undefined' && !navigator.onLine) return
      if (queueSize() === 0) {
        setPending(0)
        return
      }
      flushingRef.current = true
      try {
        await flushQueue(submitAnswer)
      } catch {
        // Silencioso: se reintenta en el proximo tick/evento.
      } finally {
        flushingRef.current = false
        if (!cancelled) setPending(queueSize())
      }
    }

    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)
    setPending(queueSize())
    void syncNow()

    const handleOnline = () => {
      setIsOnline(true)
      void syncNow()
    }
    const handleOffline = () => setIsOnline(false)
    const handleStorage = () => setPending(queueSize())
    // Cada tick refresca el conteo e intenta sincronizar lo pendiente.
    const interval = setInterval(() => {
      setPending(queueSize())
      void syncNow()
    }, 5000)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', handleStorage)

    return () => {
      cancelled = true
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', handleStorage)
      clearInterval(interval)
    }
  }, [])

  // Mostrar el banner si esta offline o si hay respuestas pendientes por sincronizar
  if (isOnline && pending === 0) return null

  if (!isOnline) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-testid="offline-indicator"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-40 mx-auto flex w-fit max-w-[calc(100%-1rem)] items-center gap-2 rounded-full border border-warning/30 bg-warning/20 px-4 py-2 text-sm font-medium text-warning shadow-lg backdrop-blur md:bottom-4"
      >
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Sin conexion
          {pending > 0 ? ` · ${pending} respuesta${pending === 1 ? '' : 's'} en cola` : '. Puedes seguir respondiendo.'}
        </span>
      </div>
    )
  }

  // Online pero con cola pendiente — toast informativo sutil
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-indicator-syncing"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-40 mx-auto flex w-fit max-w-[calc(100%-1rem)] items-center gap-2 rounded-full border border-aurora-2/30 bg-aurora-2/15 px-4 py-2 text-sm font-medium text-aurora-2 shadow-lg backdrop-blur md:bottom-4"
    >
      <RefreshCw className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      <span>Sincronizando {pending} respuesta{pending === 1 ? '' : 's'}...</span>
    </div>
  )
}
