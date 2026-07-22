import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { DiagramViewer } from './DiagramViewer'
import { ConceptCallout } from './ConceptCallout'
import { ToolBadge } from './ToolBadge'
import { GlossaryAccordion } from './GlossaryAccordion'
import { ComparisonTable } from './ComparisonTable'
import { QuickQuiz } from './QuickQuiz'
import { MermaidDiagram } from '@/components/ui/MermaidDiagram'
import { ExternalLink, BookOpen } from 'lucide-react'

type Concept = {
  concept: string
  definition_md: string | null
  importance: 'alta' | 'media' | 'baja' | null
}

type Section = {
  id: string
  section_type: string
  order_in_guide: number
  title: string | null
  body_md: string | null
  image_url: string | null
  image_caption: string | null
  metadata: Record<string, unknown> | null
}

type Props = {
  section: Section
  /** Conceptos completos de la guia (para resolver concept_ids en seccion 'concept'). */
  concepts: Concept[]
  /** ID de la guia (para QuickQuiz). */
  guideId: string
  guideSlug: string
}

const TYPE_LABEL: Record<string, string> = {
  intro: 'Introduccion',
  concept: 'Conceptos clave',
  example: 'Ejemplo',
  diagram: 'Diagrama',
  uml: 'Diagrama UML',
  tool: 'Herramientas',
  case_study: 'Caso de estudio',
  comparison_table: 'Comparativa',
  glossary: 'Glosario',
  quick_quiz: 'Quick Quiz',
  references: 'Referencias',
}

export function GuideSection({ section, concepts, guideId, guideSlug }: Props) {
  const label = TYPE_LABEL[section.section_type] ?? section.section_type
  return (
    <section data-section-id={section.id} data-section-type={section.section_type} className="space-y-3">
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold sm:text-xl">
          {section.title ?? label}
        </h2>
        <span className="rounded-full border border-bg-border/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </header>

      {renderBody(section, concepts, guideId, guideSlug)}
    </section>
  )
}

function renderBody(section: Section, concepts: Concept[], guideId: string, guideSlug: string): React.ReactNode {
  switch (section.section_type) {
    case 'intro':
    case 'example':
    case 'case_study':
      return section.body_md ? (
        <article className="prose prose-egel max-w-none prose-sm break-words prose-headings:font-semibold prose-h3:text-base prose-h4:text-sm prose-p:leading-relaxed prose-strong:text-foreground prose-blockquote:border-l-aurora-2 prose-code:rounded prose-code:bg-bg-raised/60 prose-code:px-1 prose-pre:rounded-xl prose-pre:border prose-pre:border-glass-border/40 prose-pre:bg-bg-raised/40 sm:prose-base [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.body_md}</ReactMarkdown>
        </article>
      ) : null

    case 'concept':
      return <ConceptCallout concepts={concepts} />

    case 'diagram':
      return section.image_url ? (
        <DiagramViewer
          imageUrl={section.image_url}
          caption={section.image_caption}
          title={section.title}
        />
      ) : null

    case 'uml': {
      const mermaid = (section.metadata?.mermaid as string | undefined) ?? section.body_md ?? ''
      return mermaid ? <MermaidDiagram chart={mermaid} /> : null
    }

    case 'tool': {
      const tools = (section.metadata?.tools as Array<{ name: string; url?: string; description?: string }>) ?? []
      return <ToolBadge tools={tools} />
    }

    case 'comparison_table': {
      const headers = (section.metadata?.headers as string[]) ?? []
      const rows = (section.metadata?.rows as string[][]) ?? []
      return <ComparisonTable headers={headers} rows={rows} caption={section.title ?? undefined} />
    }

    case 'glossary': {
      const terms = (section.metadata?.terms as Array<{ term: string; def: string }>) ?? []
      return <GlossaryAccordion terms={terms} />
    }

    case 'quick_quiz':
      return <QuickQuiz guideId={guideId} guideSlug={guideSlug} />

    case 'references': {
      const refs = (section.metadata?.refs as Array<{ title: string; url?: string }>) ?? []
      return (
        <ul className="space-y-2">
          {refs.map((r, i) => (
            <li key={i} className="flex items-start gap-2 rounded-lg border border-glass-border/30 bg-glass-bg/40 p-3 backdrop-blur-md">
              <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-aurora-2" />
              <div className="min-w-0 flex-1">
                {r.url ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-aurora-2 hover:underline"
                  >
                    {r.title}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-sm font-semibold">{r.title}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )
    }

    default:
      return null
  }
}
