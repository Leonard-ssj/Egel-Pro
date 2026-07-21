import { DISCIPLINAR_AREAS, TRANSVERSAL_AREAS } from '@/lib/constants/egel'
import type { Tables } from '@/types/database'

export type SyllabusConceptRow = Pick<
  Tables<'syllabus_concepts'>,
  'id' | 'section' | 'area' | 'subarea' | 'label' | 'guide_slug' | 'sort_order'
>

export type ConceptNode = {
  id: string
  label: string
  guideSlug: string | null
}

export type SubareaNode = {
  key: string // `${section}-${area}-${subarea}`
  section: 'disciplinar' | 'transversal'
  area: number
  subarea: number
  name: string
  officialQuestions: number
  concepts: ConceptNode[]
}

export type AreaNode = {
  key: string // `${section}-${area}`
  section: 'disciplinar' | 'transversal'
  area: number
  name: string
  /** Clase de color del design system (area1..area4 / cyan-ice / accent) */
  colorClass: string
  officialQuestions: number
  subareas: SubareaNode[]
}

// Color por area. Disciplinares reusan area1..area4; transversales usan
// tonos propios del design system para diferenciarlas visualmente.
function colorFor(section: string, area: number): string {
  if (section === 'disciplinar') return `area${area}`
  return area === 1 ? 'accent-400' : 'brand-400'
}

function areaMeta(section: string, area: number) {
  const src = section === 'disciplinar' ? DISCIPLINAR_AREAS : TRANSVERSAL_AREAS
  return src.find((a) => a.area === area)
}

function subareaMeta(section: string, area: number, subarea: number) {
  return areaMeta(section, area)?.subareas.find((s) => s.subarea === subarea)
}

/**
 * Agrupa los conceptos planos (de la DB) en el arbol area -> subarea -> conceptos,
 * enriqueciendo con los nombres oficiales y el numero de reactivos de egel.ts.
 */
export function buildSyllabusTree(rows: SyllabusConceptRow[]): AreaNode[] {
  const areas = new Map<string, AreaNode>()

  const sorted = [...rows].sort(
    (a, b) =>
      a.section.localeCompare(b.section) ||
      a.area - b.area ||
      a.subarea - b.subarea ||
      a.sort_order - b.sort_order,
  )

  for (const row of sorted) {
    const section = row.section as 'disciplinar' | 'transversal'
    const areaKey = `${section}-${row.area}`
    const subKey = `${section}-${row.area}-${row.subarea}`

    let area = areas.get(areaKey)
    if (!area) {
      const meta = areaMeta(section, row.area)
      area = {
        key: areaKey,
        section,
        area: row.area,
        name: meta?.name ?? `Area ${row.area}`,
        colorClass: colorFor(section, row.area),
        officialQuestions: meta?.totalQuestions ?? 0,
        subareas: [],
      }
      areas.set(areaKey, area)
    }

    let sub = area.subareas.find((s) => s.key === subKey)
    if (!sub) {
      const meta = subareaMeta(section, row.area, row.subarea)
      sub = {
        key: subKey,
        section,
        area: row.area,
        subarea: row.subarea,
        name: meta?.name ?? `Subarea ${row.subarea}`,
        officialQuestions: meta?.questions ?? 0,
        concepts: [],
      }
      area.subareas.push(sub)
    }

    sub.concepts.push({ id: row.id, label: row.label, guideSlug: row.guide_slug })
  }

  // Orden: disciplinares (1..4) antes que transversales (1..2)
  return Array.from(areas.values()).sort((a, b) => {
    if (a.section !== b.section) return a.section === 'disciplinar' ? -1 : 1
    return a.area - b.area
  })
}

export function countConcepts(tree: AreaNode[]): number {
  return tree.reduce(
    (acc, a) => acc + a.subareas.reduce((s, sub) => s + sub.concepts.length, 0),
    0,
  )
}

export function areaProgress(area: AreaNode, mastered: Set<string>) {
  let total = 0
  let done = 0
  for (const sub of area.subareas) {
    for (const c of sub.concepts) {
      total++
      if (mastered.has(c.id)) done++
    }
  }
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 }
}
