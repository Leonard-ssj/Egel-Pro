-- Realtime para sincronizar el avance de un quiz entre dispositivos del mismo
-- usuario. REPLICA IDENTITY FULL: el payload de UPDATE incluye session_id (para
-- el filtro por sesion) y todas las columnas. La RLS existente sigue aplicando,
-- asi cada usuario solo recibe cambios de SUS respuestas.
alter table public.quiz_answers replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'quiz_answers'
  ) then
    alter publication supabase_realtime add table public.quiz_answers;
  end if;
end $$;
