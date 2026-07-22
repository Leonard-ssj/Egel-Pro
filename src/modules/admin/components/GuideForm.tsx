'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { createGuide, updateGuide } from '@/modules/study/_legacy_v1_actions'
import {
  createGuideSchema,
  type CreateGuideInput,
} from '@/lib/validations/guide.schema'
import { cn } from '@/lib/utils/cn'
import type { Tables } from '@/types/database'

type Guide = Tables<'study_guides'>

type GuideFormProps = {
  initialData?: Guide
}

const SECTIONS = [
  { value: 'disciplinar', label: 'Disciplinar' },
  { value: 'transversal', label: 'Transversal' },
] as const

const AREAS = [
  { value: 1, label: 'Area 1' },
  { value: 2, label: 'Area 2' },
  { value: 3, label: 'Area 3' },
  { value: 4, label: 'Area 4' },
] as const

const SUBAREAS = [
  { value: 1, label: 'Subarea 1' },
  { value: 2, label: 'Subarea 2' },
  { value: 3, label: 'Subarea 3' },
  { value: 4, label: 'Subarea 4' },
  { value: 5, label: 'Subarea 5' },
] as const

export function GuideForm({ initialData }: GuideFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showPreview, setShowPreview] = useState(true)

  const form = useForm<CreateGuideInput>({
    resolver: zodResolver(createGuideSchema),
    defaultValues: {
      section: (initialData?.section as 'disciplinar' | 'transversal') ?? 'disciplinar',
      area: initialData?.area ?? 1,
      subarea: initialData?.subarea ?? 1,
      title: initialData?.title ?? '',
      content: initialData?.content ?? '',
      summary: initialData?.summary ?? '',
      ceneval_tips: initialData?.ceneval_tips ?? '',
      reading_time_minutes: initialData?.reading_time_minutes ?? 10,
      is_published: initialData?.is_published ?? false,
    },
  })

  // Observamos content para el preview en vivo sin re-render del form completo.
  const contentValue = form.watch('content')

  function onSubmit(values: CreateGuideInput) {
    startTransition(async () => {
      const result = initialData
        ? await updateGuide(initialData.id, values)
        : await createGuide(values)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(initialData ? 'Guia actualizada' : 'Guia creada')
      router.push('/admin/guides')
      router.refresh()
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {initialData ? 'Editar guia' : 'Nueva guia'}
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreview((v) => !v)}
            data-testid="toggle-preview"
          >
            {showPreview ? (
              <>
                <EyeOff className="h-4 w-4" />
                Ocultar preview
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Mostrar preview
              </>
            )}
          </Button>
        </div>

        <div
          className={cn(
            'grid gap-6',
            showPreview ? 'lg:grid-cols-2' : 'lg:grid-cols-1',
          )}
        >
          {/* Columna del formulario */}
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seccion</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={field.value}
                        onChange={field.onChange}
                      >
                        {SECTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      >
                        {AREAS.map((a) => (
                          <option key={a.value} value={a.value}>
                            {a.label}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subarea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subarea</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      >
                        {SUBAREAS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titulo</FormLabel>
                  <FormControl>
                    <Input placeholder="Titulo de la guia" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reading_time_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tiempo de lectura (minutos)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resumen (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Breve descripcion de lo que aprendera el estudiante"
                      className="min-h-[80px]"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>Maximo 1000 caracteres.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ceneval_tips"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tips CENEVAL (opcional, soporta Markdown)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Consejos especificos para el examen"
                      className="min-h-[120px] font-mono text-xs"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenido (Markdown)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="# Titulo de la seccion&#10;&#10;Escribe el contenido de la guia en Markdown..."
                      className="min-h-[400px] font-mono text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Soporta GitHub Flavored Markdown: tablas, listas, codigo, etc.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_published"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-md border border-bg-border p-3">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value as boolean}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 rounded border-input bg-background accent-primary"
                    />
                  </FormControl>
                  <div className="leading-none">
                    <FormLabel className="text-sm font-normal">
                      Publicar guia (visible para estudiantes)
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/guides')}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                {initialData ? 'Guardar cambios' : 'Crear guia'}
              </Button>
            </div>
          </div>

          {/* Columna del preview */}
          {showPreview ? (
            <Card className="lg:sticky lg:top-4 lg:h-fit lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
              <CardContent className="p-6">
                <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">
                  Vista previa
                </p>
                {contentValue ? (
                  <div className="prose prose-egel max-w-none prose-headings:font-semibold">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{contentValue}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Empieza a escribir contenido para ver la vista previa.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </form>
    </Form>
  )
}
