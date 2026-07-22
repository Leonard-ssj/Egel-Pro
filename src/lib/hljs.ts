import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import java from 'highlight.js/lib/languages/java'
import sql from 'highlight.js/lib/languages/sql'
import python from 'highlight.js/lib/languages/python'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import plaintext from 'highlight.js/lib/languages/plaintext'

// Registramos solo los lenguajes relevantes para el EGEL ISOFT (bundle liviano).
// hljs registra los alias (js, ts, py, sh, html...) automaticamente.
const LANGS: Record<string, Parameters<typeof hljs.registerLanguage>[1]> = {
  javascript,
  typescript,
  java,
  sql,
  python,
  json,
  bash,
  xml,
  css,
  plaintext,
}
for (const [name, def] of Object.entries(LANGS)) {
  if (!hljs.getLanguage(name)) hljs.registerLanguage(name, def)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Devuelve el codigo resaltado como HTML (spans .hljs-*). Si no se reconoce el
 * lenguaje intenta autodeteccion; si algo falla, escapa el texto tal cual.
 */
export function highlightCode(code: string, lang?: string): string {
  try {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
    }
    return hljs.highlightAuto(code).value
  } catch {
    return escapeHtml(code)
  }
}
