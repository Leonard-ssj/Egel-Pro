import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Exporta TODAS las preguntas activas del banco (916+) a un XLSX descargable.
 * Estructura del archivo:
 *   - Hoja "Preguntas": una fila por reactivo con todas las columnas
 *   - Hoja "Por area": resumen agregado por seccion/area/subarea
 *   - Hoja "Estimulos": textos de comprension lectora con sus preguntas multi
 *
 * Solo accesible para usuarios autenticados. Usa admin client para bypassear
 * RLS y devolver el banco completo (las preguntas son contenido publico para
 * estudiantes registrados).
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Exportar el banco COMPLETO es sensible: solo admin. Evita que un estudiante
  // (o el usuario demo) se descargue todo el contenido por la URL directa.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const admin = createAdminClient()

  // 1. Cargar preguntas en paginas (Supabase limita ~1000 por query)
  const allRows: Array<Record<string, unknown>> = []
  let offset = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await admin
      .from('questions')
      .select('section, area, area_name, subarea, subarea_name, type, question_text, option_a, option_b, option_c, correct_answer, explanation, difficulty, image_url, tags, is_pilot, is_active, is_deleted, times_seen, times_correct, stimulus_id, id, created_at')
      .eq('is_deleted', false)
      .eq('is_active', true)
      .order('section', { ascending: true })
      .order('area', { ascending: true })
      .order('subarea', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data || data.length === 0) break
    allRows.push(...data)
    if (data.length < PAGE) break
    offset += PAGE
  }

  // 2. Cargar estimulos
  const { data: stimuli } = await admin
    .from('stimuli')
    .select('id, title, text_type, subarea_context, body, is_active, created_at')
    .eq('is_active', true)

  // 3. Construir hoja "Preguntas"
  const sheetPreguntas = allRows.map((r, i) => ({
    '#': i + 1,
    'Seccion': r.section,
    'Area': r.area,
    'Nombre Area': r.area_name,
    'Subarea': r.subarea,
    'Nombre Subarea': r.subarea_name,
    'Tipo': r.type,
    'Pregunta': r.question_text,
    'Opcion A': r.option_a,
    'Opcion B': r.option_b,
    'Opcion C': r.option_c,
    'Respuesta correcta': String(r.correct_answer).toUpperCase(),
    'Explicacion': r.explanation ?? '',
    'Dificultad': r.difficulty ?? 'medium',
    'Imagen URL': r.image_url ?? '',
    'Tags': Array.isArray(r.tags) ? (r.tags as string[]).join(', ') : '',
    'Piloto': r.is_pilot ? 'si' : 'no',
    'Veces visto': r.times_seen ?? 0,
    'Veces correcto': r.times_correct ?? 0,
    'Stimulus ID': r.stimulus_id ?? '',
    'ID': r.id,
    'Creada': r.created_at,
  }))

  // 4. Hoja "Por area" — agregado
  const bySub = new Map<string, { section: string; area: number; area_name: string; subarea: number; subarea_name: string; total: number; easy: number; medium: number; hard: number; multi: number }>()
  for (const r of allRows) {
    const key = `${r.section}/${r.area}/${r.subarea}`
    const cur = bySub.get(key) ?? {
      section: r.section as string,
      area: r.area as number,
      area_name: r.area_name as string,
      subarea: r.subarea as number,
      subarea_name: r.subarea_name as string,
      total: 0, easy: 0, medium: 0, hard: 0, multi: 0,
    }
    cur.total++
    const diff = (r.difficulty as string) ?? 'medium'
    if (diff === 'easy') cur.easy++
    else if (diff === 'hard') cur.hard++
    else cur.medium++
    if (r.type === 'multireactivo') cur.multi++
    bySub.set(key, cur)
  }
  const sheetResumen = Array.from(bySub.values()).map((r) => ({
    'Seccion': r.section,
    'Area': r.area,
    'Nombre Area': r.area_name,
    'Subarea': r.subarea,
    'Nombre Subarea': r.subarea_name,
    'Total': r.total,
    'Faciles': r.easy,
    'Medias': r.medium,
    'Dificiles': r.hard,
    'Multirreactivo': r.multi,
  }))

  // 5. Hoja "Estimulos"
  const sheetStimuli = (stimuli ?? []).map((s, i) => ({
    '#': i + 1,
    'Titulo': s.title ?? '',
    'Tipo texto': s.text_type,
    'Contexto': s.subarea_context,
    'Cuerpo': s.body,
    'ID': s.id,
    'Creado': s.created_at,
  }))

  // 6. Generar workbook
  const wb = XLSX.utils.book_new()
  const ws1 = XLSX.utils.json_to_sheet(sheetPreguntas)
  const ws2 = XLSX.utils.json_to_sheet(sheetResumen)
  const ws3 = XLSX.utils.json_to_sheet(sheetStimuli)

  // Ancho de columnas razonable (texto largo)
  ws1['!cols'] = [
    { wch: 5 }, { wch: 12 }, { wch: 6 }, { wch: 35 }, { wch: 8 }, { wch: 50 },
    { wch: 14 }, { wch: 60 }, { wch: 40 }, { wch: 40 }, { wch: 40 },
    { wch: 18 }, { wch: 60 }, { wch: 12 }, { wch: 30 }, { wch: 30 },
    { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 38 }, { wch: 38 }, { wch: 22 },
  ]
  ws2['!cols'] = [{ wch: 12 }, { wch: 6 }, { wch: 35 }, { wch: 8 }, { wch: 50 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 14 }]
  ws3['!cols'] = [{ wch: 5 }, { wch: 50 }, { wch: 22 }, { wch: 22 }, { wch: 100 }, { wch: 38 }, { wch: 22 }]

  XLSX.utils.book_append_sheet(wb, ws1, 'Preguntas')
  XLSX.utils.book_append_sheet(wb, ws2, 'Por subarea')
  XLSX.utils.book_append_sheet(wb, ws3, 'Estimulos')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  const today = new Date().toISOString().slice(0, 10)
  const filename = `egelpro-banco-preguntas-${today}.xlsx`

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
