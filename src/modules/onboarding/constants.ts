// Cookie de sesion que marca "salte el onboarding por ahora". NO persiste en la
// BD: se borra al cerrar sesion, asi el usuario vuelve al onboarding en su
// proximo login hasta que realmente lo complete.
export const ONBOARDING_SKIP_COOKIE = 'eg_onboarding_skipped'
