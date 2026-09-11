begin;

-- Tighten social visibility for the public beta.
drop policy if exists social_group_members_read on public.social_group_members;
create policy social_group_members_read on public.social_group_members for select to authenticated using (
  exists (select 1 from public.social_groups g where g.id = group_id and g.privacy = 'public')
  or user_id = (select auth.uid())
);

drop policy if exists social_bookmarks_read on public.social_bookmarks;
create policy social_bookmarks_read on public.social_bookmarks for select to authenticated using (user_id = (select auth.uid()));

-- Lightweight beta feedback / Pro interest capture.
create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  kind text not null default 'feedback' check (kind in ('feedback','bug','pro_interest')),
  rating smallint check (rating is null or rating between 1 and 4),
  message text not null default '' check (char_length(message) between 1 and 2000),
  page_path text not null default '' check (char_length(page_path) <= 300),
  created_at timestamptz not null default now()
);
alter table public.beta_feedback enable row level security;
revoke all on public.beta_feedback from public, anon, authenticated;
grant select, insert on public.beta_feedback to authenticated;
create policy beta_feedback_insert_own on public.beta_feedback for insert to authenticated with check (user_id = (select auth.uid()));
create policy beta_feedback_read_own on public.beta_feedback for select to authenticated using (user_id = (select auth.uid()));

-- Public social-media bucket: content posted in the community is intentionally public media.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('social-media', 'social-media', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists social_media_insert_own on storage.objects;
create policy social_media_insert_own on storage.objects for insert to authenticated with check (
  bucket_id = 'social-media' and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists social_media_update_own on storage.objects;
create policy social_media_update_own on storage.objects for update to authenticated using (
  bucket_id = 'social-media' and owner_id = (select auth.uid()::text)
) with check (
  bucket_id = 'social-media' and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists social_media_delete_own on storage.objects;
create policy social_media_delete_own on storage.objects for delete to authenticated using (
  bucket_id = 'social-media' and owner_id = (select auth.uid()::text)
);

commit;
