-- Realtime en user_progress y streaks para que /progress y /dashboard se
-- actualicen en vivo cuando cambia el avance del usuario. RLS existente aplica.
alter table public.user_progress replica identity full;
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='user_progress') then
    alter publication supabase_realtime add table public.user_progress;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='streaks') then
    alter publication supabase_realtime add table public.streaks;
  end if;
end $$;
