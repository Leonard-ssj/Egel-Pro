-- Realtime en quiz_sessions para que la pantalla /quiz refleje en vivo cuando
-- una sesion inicia/avanza/termina en otro dispositivo (banner "quiz en progreso").
-- RLS existente aplica: cada usuario solo recibe sus propias sesiones.
alter table public.quiz_sessions replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'quiz_sessions'
  ) then
    alter publication supabase_realtime add table public.quiz_sessions;
  end if;
end $$;
