-- Mapa del Temario: conceptos clave por subarea + progreso de dominio por usuario.
-- Aditivo. No toca tablas existentes. RLS: conceptos legibles por autenticados,
-- escritura solo admin; el progreso es privado de cada usuario.

-- Datos de referencia: cada concepto pertenece a una subarea de un examen.
create table if not exists public.syllabus_concepts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null default '11111111-1111-4111-8111-111111111111',
  section text not null check (section in ('disciplinar', 'transversal')),
  area int not null,
  subarea int not null,
  label text not null,
  sort_order int not null default 0,
  guide_slug text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_syllabus_concepts_exam
  on public.syllabus_concepts (exam_id, section, area, subarea, sort_order);

-- Progreso: que conceptos ha marcado el usuario como dominados.
create table if not exists public.user_concept_mastery (
  user_id uuid not null references auth.users (id) on delete cascade,
  concept_id uuid not null references public.syllabus_concepts (id) on delete cascade,
  exam_id uuid not null default '11111111-1111-4111-8111-111111111111',
  mastered_at timestamptz not null default now(),
  primary key (user_id, concept_id)
);

create index if not exists idx_user_concept_mastery_user
  on public.user_concept_mastery (user_id, exam_id);

-- RLS
alter table public.syllabus_concepts enable row level security;
alter table public.user_concept_mastery enable row level security;

-- Conceptos: cualquier usuario autenticado los lee (datos de referencia).
drop policy if exists syllabus_concepts_select on public.syllabus_concepts;
create policy syllabus_concepts_select on public.syllabus_concepts
  for select using (auth.uid() is not null);

-- Conceptos: solo admin puede crear/editar/borrar.
drop policy if exists syllabus_concepts_admin_write on public.syllabus_concepts;
create policy syllabus_concepts_admin_write on public.syllabus_concepts
  for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Progreso: cada usuario ve y gestiona solo el suyo.
drop policy if exists user_concept_mastery_all on public.user_concept_mastery;
create policy user_concept_mastery_all on public.user_concept_mastery
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
