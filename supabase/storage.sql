-- =====================================================
-- LÜNABI — Supabase Storage buckets
-- Ejecutar DESPUÉS de schema.sql
-- =====================================================

-- Buckets públicos (read abierto, write solo admin)
insert into storage.buckets (id, name, public)
values
  ('products', 'products', true),
  ('brands',   'brands',   true),
  ('slides',   'slides',   true)
on conflict (id) do nothing;

-- Helper: aplicar mismas policies a los 3 buckets
do $$
declare
  b text;
begin
  foreach b in array array['products','brands','slides'] loop
    -- read público
    execute format(
      $f$drop policy if exists "public_read_%I" on storage.objects$f$, b);
    execute format(
      $f$create policy "public_read_%I" on storage.objects
           for select
           using (bucket_id = %L)$f$, b, b);

    -- admin write (insert/update/delete)
    execute format(
      $f$drop policy if exists "admin_write_%I" on storage.objects$f$, b);
    execute format(
      $f$create policy "admin_write_%I" on storage.objects
           for all
           using (bucket_id = %L and public.is_admin())
           with check (bucket_id = %L and public.is_admin())$f$, b, b, b);
  end loop;
end $$;
