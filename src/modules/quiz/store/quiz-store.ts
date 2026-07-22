'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { CorrectAnswer } from '@/types/global'

export type QuizAnswerState = {
  questionId: string
  userAnswer: CorrectAnswer | null
  isMarked: boolean
  /** Segundos que el usuario estuvo en esta pregunta */
  timeSpentSeconds: number
}

type QuizStoreState = {
  sessionId: string | null
  totalQuestions: number
  currentIndex: number
  answers: Record<string, QuizAnswerState>
  startedAt: number | null

  // Acciones
  init: (
    sessionId: string,
    totalQuestions: number,
    initialAnswers?: Record<string, QuizAnswerState>,
    startIndex?: number,
  ) => void
  /** Aplica un cambio de respuesta recibido por Realtime desde otro dispositivo. */
  applyRemoteAnswer: (
    questionId: string,
    userAnswer: CorrectAnswer | null,
    isMarked: boolean,
  ) => void
  reset: () => void
  goToIndex: (index: number) => void
  next: () => void
  prev: () => void
  setAnswer: (questionId: string, userAnswer: CorrectAnswer | null) => void
  toggleMark: (questionId: string) => void
  addTimeSpent: (questionId: string, seconds: number) => void

  // Selectores
  answeredCount: () => number
  markedCount: () => number
}

const INITIAL: Pick<QuizStoreState, 'sessionId' | 'totalQuestions' | 'currentIndex' | 'answers' | 'startedAt'> = {
  sessionId: null,
  totalQuestions: 0,
  currentIndex: 0,
  answers: {},
  startedAt: null,
}

// Persist en localStorage para sobrevivir refresh y offline.
export const useQuizStore = create<QuizStoreState>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      init: (sessionId, totalQuestions, initialAnswers = {}, startIndex = 0) => {
        const existing = get()
        const sameSession = existing.sessionId === sessionId && Boolean(existing.startedAt)
        if (sameSession) {
          // Misma sesion ya en curso en este dispositivo: conservamos el avance
          // local (mas fresco) y solo RELLENAMOS lo que falte con el del servidor
          // (respuestas hechas en otro dispositivo). Asi no se pierde progreso.
          set({
            totalQuestions,
            answers: { ...initialAnswers, ...existing.answers },
          })
          return
        }
        // Sesion nueva en este dispositivo: hidratar desde el servidor.
        set({
          sessionId,
          totalQuestions,
          currentIndex: Math.min(Math.max(startIndex, 0), Math.max(totalQuestions - 1, 0)),
          answers: initialAnswers,
          startedAt: Date.now(),
        })
      },

      applyRemoteAnswer: (questionId, userAnswer, isMarked) => {
        set((state) => {
          const prev = state.answers[questionId]
          // Sin cambios reales -> no re-render.
          if (prev && prev.userAnswer === userAnswer && prev.isMarked === isMarked) {
            return state
          }
          return {
            answers: {
              ...state.answers,
              [questionId]: {
                questionId,
                userAnswer,
                isMarked,
                timeSpentSeconds: prev?.timeSpentSeconds ?? 0,
              },
            },
          }
        })
      },

      reset: () => set({ ...INITIAL }),

      goToIndex: (index) => {
        const total = get().totalQuestions
        if (index < 0 || index >= total) return
        set({ currentIndex: index })
      },

      next: () => {
        const { currentIndex, totalQuestions } = get()
        if (currentIndex < totalQuestions - 1) set({ currentIndex: currentIndex + 1 })
      },

      prev: () => {
        const { currentIndex } = get()
        if (currentIndex > 0) set({ currentIndex: currentIndex - 1 })
      },

      setAnswer: (questionId, userAnswer) => {
        set((state) => ({
          answers: {
            ...state.answers,
            [questionId]: {
              questionId,
              userAnswer,
              isMarked: state.answers[questionId]?.isMarked ?? false,
              timeSpentSeconds: state.answers[questionId]?.timeSpentSeconds ?? 0,
            },
          },
        }))
      },

      toggleMark: (questionId) => {
        set((state) => {
          const prev = state.answers[questionId]
          return {
            answers: {
              ...state.answers,
              [questionId]: {
                questionId,
                userAnswer: prev?.userAnswer ?? null,
                isMarked: !(prev?.isMarked ?? false),
                timeSpentSeconds: prev?.timeSpentSeconds ?? 0,
              },
            },
          }
        })
      },

      addTimeSpent: (questionId, seconds) => {
        set((state) => {
          const prev = state.answers[questionId]
          return {
            answers: {
              ...state.answers,
              [questionId]: {
                questionId,
                userAnswer: prev?.userAnswer ?? null,
                isMarked: prev?.isMarked ?? false,
                timeSpentSeconds: (prev?.timeSpentSeconds ?? 0) + seconds,
              },
            },
          }
        })
      },

      answeredCount: () =>
        Object.values(get().answers).filter((a) => a.userAnswer !== null).length,

      markedCount: () =>
        Object.values(get().answers).filter((a) => a.isMarked).length,
    }),
    {
      name: 'egelpro-quiz-state-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        sessionId: s.sessionId,
        totalQuestions: s.totalQuestions,
        currentIndex: s.currentIndex,
        answers: s.answers,
        startedAt: s.startedAt,
      }),
    },
  ),
)
