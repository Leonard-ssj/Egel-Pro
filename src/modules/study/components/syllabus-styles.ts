// Estilos por color de area (clases completas para que Tailwind no las purgue).
// colorClass viene de buildSyllabusTree: area1..area4 (disciplinares),
// accent-400 (transversal 1) y brand-400 (transversal 2).

export type SyllabusColorStyle = {
  text: string
  border: string
  bg: string
  dot: string
  chipDone: string
  fill: string
}

export const SYLLABUS_STYLES: Record<string, SyllabusColorStyle> = {
  area1: {
    text: 'text-area1',
    border: 'border-area1/50',
    bg: 'bg-area1/10',
    dot: 'bg-area1',
    chipDone: 'border-area1/60 bg-area1/15',
    fill: 'bg-area1',
  },
  area2: {
    text: 'text-area2',
    border: 'border-area2/50',
    bg: 'bg-area2/10',
    dot: 'bg-area2',
    chipDone: 'border-area2/60 bg-area2/15',
    fill: 'bg-area2',
  },
  area3: {
    text: 'text-area3',
    border: 'border-area3/50',
    bg: 'bg-area3/10',
    dot: 'bg-area3',
    chipDone: 'border-area3/60 bg-area3/15',
    fill: 'bg-area3',
  },
  area4: {
    text: 'text-area4',
    border: 'border-area4/50',
    bg: 'bg-area4/10',
    dot: 'bg-area4',
    chipDone: 'border-area4/60 bg-area4/15',
    fill: 'bg-area4',
  },
  'accent-400': {
    text: 'text-accent-400',
    border: 'border-accent-400/50',
    bg: 'bg-accent-400/10',
    dot: 'bg-accent-400',
    chipDone: 'border-accent-400/60 bg-accent-400/15',
    fill: 'bg-accent-400',
  },
  'brand-400': {
    text: 'text-brand-400',
    border: 'border-brand-400/50',
    bg: 'bg-brand-400/10',
    dot: 'bg-brand-400',
    chipDone: 'border-brand-400/60 bg-brand-400/15',
    fill: 'bg-brand-400',
  },
}

export function styleFor(colorClass: string): SyllabusColorStyle {
  return SYLLABUS_STYLES[colorClass] ?? SYLLABUS_STYLES.area1!
}
