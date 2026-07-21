/**
 * Rutas de la aplicacion EGELPro
 * Centralizado para evitar strings magicos dispersos en el codigo
 */

export const ROUTES = {
  // Publicas
  home:           '/',
  login:          '/login',
  register:       '/register',
  forgotPassword: '/forgot-password',

  // Dashboard (privadas)
  dashboard:      '/dashboard',
  quiz: {
    root:         '/quiz',
    session:      (id: string) => `/quiz/session/${id}`,
    results:      (id: string) => `/quiz/results/${id}`,
  },
  simulacro: {
    root:         '/simulacro',
    group:        (groupId: string) => `/simulacro/${groupId}`,
    results:      (groupId: string) => `/simulacro/${groupId}/results`,
  },
  study: {
    root:         '/study',
    mapa:         '/study/mapa',
    guide:        (area: number, subarea: number) => `/study/${area}/${subarea}`,
  },
  progress:       '/progress',
  achievements:   '/achievements',
  profile:        '/profile',

  // Admin (solo role=admin)
  admin: {
    root:         '/admin',
    questions:    '/admin/questions',
    newQuestion:  '/admin/questions/new',
    editQuestion: (id: string) => `/admin/questions/${id}`,
    importQ:      '/admin/questions/import',
    guides:       '/admin/guides',
    users:        '/admin/users',
    stats:        '/admin/stats',
  },
} as const
