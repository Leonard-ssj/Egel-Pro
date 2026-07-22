'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MermaidDiagram } from '@/components/ui/MermaidDiagram'
import { cn } from '@/lib/utils/cn'

// Detecta bloques de codigo cercados ```lang ... ``` dentro del texto de la
// pregunta. Los reactivos guardan el codigo/diagramas embebido en question_text,
// asi que aqui lo separamos para renderizarlo bien (antes salia como texto plano
// con los backticks a la vista).
const FENCE = /```([\w-]*)\r?\n?([\s\S]*?)```/g

type Segment =
  | { type: 'md'; content: string }
  | { type: 'code'; content: string; lang?: string }
  | { type: 'mermaid'; content: string }

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = []
  let last = 0
  let m: RegExpExecArray | null
  FENCE.lastIndex = 0
  while ((m = FENCE.exec(text)) !== null) {
    if (m.index > last) segments.push({ type: 'md', content: text.slice(last, m.index) })
    const lang = (m[1] || '').toLowerCase()
    const code = m[2].replace(/\s+$/, '')
    segments.push(
      lang === 'mermaid'
        ? { type: 'mermaid', content: code }
        : { type: 'code', content: code, lang },
    )
    last = FENCE.lastIndex
  }
  if (last < text.length) segments.push({ type: 'md', content: text.slice(last) })
  return segments
}

/**
 * Renderiza el enunciado de una pregunta:
 *  - Texto -> Markdown (negritas, listas, codigo inline...).
 *  - Bloques ```codigo``` -> vista tipo editor/terminal (monoespaciado, scroll).
 *  - Bloques ```mermaid``` -> diagrama (MermaidDiagram, estilo draw.io).
 */
export function QuestionRichText({
  text,
  className,
  proseSize = 'base',
}: {
  text: string
  className?: string
  proseSize?: 'sm' | 'base'
}) {
  const segments = parseSegments(text)

  return (
    <div className={cn('space-y-3', className)}>
      {segments.map((seg, i) => {
        if (seg.type === 'mermaid') {
          return <MermaidDiagram key={i} chart={seg.content} />
        }
        if (seg.type === 'code') {
          return <CodeBlock key={i} code={seg.content} lang={seg.lang} />
        }
        if (!seg.content.trim()) return null
        return (
          <div
            key={i}
            className={cn(
              'prose prose-invert max-w-none break-words',
              'prose-p:leading-relaxed prose-strong:text-foreground',
              'prose-code:rounded prose-code:bg-bg-raised/70 prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-aurora-2 prose-code:before:content-none prose-code:after:content-none',
              proseSize === 'base' ? 'prose-sm sm:prose-base' : 'prose-sm',
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{seg.content}</ReactMarkdown>
          </div>
        )
      })}
    </div>
  )
}

/** Bloque de codigo con look de editor/terminal (barra con puntos + monoespaciado). */
function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-glass-border/40 bg-[#0d1117]">
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.04] px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" aria-hidden />
        {lang ? (
          <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-slate-400">
            {lang}
          </span>
        ) : null}
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed sm:text-sm">
        <code className="font-mono text-slate-100">{code}</code>
      </pre>
    </div>
  )
}
