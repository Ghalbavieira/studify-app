begin;

-- Apply after the shared Web migrations 001–007. This intentionally places all
-- existing UGC in review. Deploy the terms gate on the Web before applying.
create schema if not exists community_private;
revoke all on schema community_private from public, anon, authenticated;

create table public.community_policy (
  singleton boolean primary key default true check (singleton),
  version text not null,
  support_email text not null default '',
  media_prefix text not null default '',
  enabled boolean not null default false,
  check (not enabled or support_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);
insert into public.community_policy (version) values ('2026-09-13');
alter table public.community_policy enable row level security;
grant select on public.community_policy to anon, authenticated;
create policy community_policy_read on public.community_policy for select using (true);
revoke insert, update, delete on public.community_policy from public, anon, authenticated;

create table public.community_acceptances (
  user_id uuid not null references auth.users(id) on delete cascade,
  version text not null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, version)
);
create table public.community_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create table community_private.moderators (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table community_private.suspensions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text not null,
  moderator_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table community_private.reviews (
  kind text not null check (kind in ('post','comment','profile','group')),
  content_id uuid not null,
  author_id uuid references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  revision bigint not null default 1,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (kind, content_id)
);
create table public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('post','comment','profile','group')),
  content_id uuid not null,
  reason text not null check (reason in ('harassment','hate','sexual','child_safety','violence','spam','privacy','other')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create table community_private.report_evidence (
  report_id uuid primary key references public.community_reports(id) on delete cascade,
  snapshot jsonb not null
);
create table community_private.audit (
  id bigint generated always as identity primary key,
  moderator_id uuid references auth.users(id) on delete set null,
  kind text not null,
  content_id uuid not null,
  action text not null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index community_reviews_pending on community_private.reviews(status, updated_at);
create index community_reports_open on public.community_reports(status, created_at);
create index community_blocks_target on public.community_blocks(blocked_id, blocker_id);

alter table public.community_acceptances enable row level security;
alter table public.community_blocks enable row level security;
alter table public.community_reports enable row level security;
revoke all on public.community_acceptances, public.community_blocks, public.community_reports from public, anon, authenticated;
grant select on public.community_acceptances, public.community_blocks, public.community_reports to authenticated;
create policy acceptances_own on public.community_acceptances for select to authenticated using (user_id = (select auth.uid()));
create policy blocks_own on public.community_blocks for select to authenticated using (blocker_id = (select auth.uid()));
create policy reports_own on public.community_reports for select to authenticated using (reporter_id = (select auth.uid()));

create function public.community_is_moderator() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (select 1 from community_private.moderators where user_id = auth.uid()) and not exists (select 1 from community_private.suspensions where user_id = auth.uid());
$$;
create function public.community_is_blocked(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.community_blocks where
    (blocker_id = auth.uid() and blocked_id = p_user) or (blocked_id = auth.uid() and blocker_id = p_user));
$$;
create function public.community_can_participate() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and exists (select 1 from public.community_policy where enabled and support_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    and not exists (select 1 from community_private.suspensions where user_id = auth.uid())
    and exists (select 1 from public.community_acceptances a join public.community_policy p on p.version = a.version where a.user_id = auth.uid());
$$;
create function public.community_can_view(p_kind text, p_id uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare r community_private.reviews; parent_id uuid; group_id uuid;
begin
  if auth.uid() is null then return false; end if;
  if not exists (select 1 from public.community_policy where enabled) then return false; end if;
  select * into r from community_private.reviews where kind = p_kind and content_id = p_id;
  if not found or r.deleted or public.community_is_blocked(r.author_id) then return false; end if;
  if exists (select 1 from community_private.suspensions where user_id = r.author_id) then return r.author_id = auth.uid(); end if;
  if r.status <> 'approved' and r.author_id is distinct from auth.uid() then return false; end if;
  if p_kind = 'comment' then
    parent_id := (r.snapshot->>'post_id')::uuid;
    return public.community_can_view('post', parent_id);
  elsif p_kind = 'post' then
    group_id := (r.snapshot->>'group_id')::uuid;
    if group_id is not null then return public.community_can_view('group', group_id); end if;
  elsif p_kind = 'group' and r.snapshot->>'privacy' = 'private' then
    return r.author_id = auth.uid() or exists (select 1 from public.social_group_members m where m.group_id = p_id and m.user_id = auth.uid());
  end if;
  return true;
end;
$$;

-- Approved media must be immutable: inline images or new, non-replaceable
-- objects in this project's social-media bucket. Other URL hosts can change after review.
create function community_private.valid_media(p_snapshot jsonb, p_author uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare field text; media text; prefix text;
begin
  select media_prefix into prefix from public.community_policy;
  foreach field in array array['media_url','avatar_url','cover_url'] loop
    media := p_snapshot->>field;
    if media is null or media = '' then continue; end if;
    if char_length(media) <= 2800000 and media ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$' then continue; end if;
    if prefix like 'https://%' and p_author is not null
      and starts_with(media, prefix || '/' || p_author::text || '/')
      and substring(media from char_length(prefix || '/' || p_author::text || '/') + 1) ~ '^[a-f0-9-]{36}\.(png|jpg|jpeg|webp)$' then continue; end if;
    return false;
  end loop;
  return true;
end;
$$;

-- Enforce consent and pre-publication review even for old clients and direct API writes.
create function community_private.enqueue_review() returns trigger
language plpgsql security definer set search_path = '' as $$
declare k text := tg_argv[0]; payload jsonb := to_jsonb(new); old_payload jsonb; content uuid; author uuid;
begin
  if auth.uid() is not null and not public.community_can_participate() then
    raise exception 'Aceite as regras atuais da Comunidade. Contas suspensas não podem publicar.' using errcode = '42501';
  end if;
  if k = 'profile' then
    content := new.user_id; author := new.user_id;
    payload := payload - 'studied_seconds' - 'created_at' - 'updated_at';
  elsif k = 'group' then content := new.id; author := new.created_by;
  else content := new.id; author := new.user_id;
  end if;
  if not community_private.valid_media(payload, author) then raise exception 'Envie a imagem novamente pelo Studify. Links externos de mídia não são aceitos.'; end if;
  if tg_op = 'UPDATE' then
    old_payload := to_jsonb(old) - 'created_at' - 'updated_at';
    if k = 'profile' then old_payload := old_payload - 'studied_seconds'; end if;
    if old_payload = payload - 'created_at' - 'updated_at' then return new; end if;
  end if;
  insert into community_private.reviews(kind, content_id, author_id, snapshot)
  values (k, content, author, payload)
  on conflict(kind, content_id) do update set snapshot = excluded.snapshot, author_id = excluded.author_id,
    status = 'pending', deleted = false, revision = community_private.reviews.revision + 1, updated_at = now();
  return new;
end;
$$;
create trigger community_review_post after insert or update on public.social_posts for each row execute function community_private.enqueue_review('post');
create trigger community_review_comment after insert or update on public.social_comments for each row execute function community_private.enqueue_review('comment');
create trigger community_review_profile after insert or update on public.social_profiles for each row execute function community_private.enqueue_review('profile');
create trigger community_review_group after insert or update on public.social_groups for each row execute function community_private.enqueue_review('group');

create function community_private.mark_deleted() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update community_private.reviews set deleted = true, revision = revision + 1, updated_at = now()
  where kind = tg_argv[0] and content_id = case when tg_argv[0] = 'profile' then (to_jsonb(old)->>'user_id')::uuid else (to_jsonb(old)->>'id')::uuid end;
  return old;
end;
$$;
create trigger community_deleted_post after delete on public.social_posts for each row execute function community_private.mark_deleted('post');
create trigger community_deleted_comment after delete on public.social_comments for each row execute function community_private.mark_deleted('comment');
create trigger community_deleted_profile after delete on public.social_profiles for each row execute function community_private.mark_deleted('profile');
create trigger community_deleted_group after delete on public.social_groups for each row execute function community_private.mark_deleted('group');

insert into community_private.reviews(kind, content_id, author_id, snapshot)
select 'post', id, user_id, to_jsonb(p) from public.social_posts p union all
select 'comment', id, user_id, to_jsonb(c) from public.social_comments c union all
select 'profile', user_id, user_id, to_jsonb(p) from public.social_profiles p union all
select 'group', id, created_by, to_jsonb(g) from public.social_groups g;

-- Restrictive policies compose with existing ownership/group RLS instead of widening it.
create policy community_posts_read on public.social_posts as restrictive for select to authenticated using (public.community_can_view('post', id));
create policy community_comments_read on public.social_comments as restrictive for select to authenticated using (public.community_can_view('comment', id));
create policy community_profiles_read on public.social_profiles as restrictive for select to authenticated using (public.community_can_view('profile', user_id));
create policy community_groups_read on public.social_groups as restrictive for select to authenticated using (public.community_can_view('group', id));

-- Remove the legacy group/member recursion while preserving private group visibility.
drop policy if exists social_groups_read on public.social_groups;
create policy social_groups_read on public.social_groups for select to authenticated using (public.community_can_view('group', id));
drop policy if exists social_group_members_read on public.social_group_members;
create policy social_group_members_read on public.social_group_members for select to authenticated using (user_id = auth.uid() or public.community_can_view('group', group_id));
create policy community_members_read on public.social_group_members as restrictive for select to authenticated using (not public.community_is_blocked(user_id));

-- Reactions and follows must not bypass visibility or suspensions.
do $$
declare t text;
begin
  foreach t in array array['social_likes','social_reposts','social_bookmarks'] loop
    execute format('create policy community_reaction_read on public.%I as restrictive for select to authenticated using (public.community_can_view(''post'', post_id) and not public.community_is_blocked(user_id))', t);
    execute format('create policy community_reaction_insert on public.%I as restrictive for insert to authenticated with check (public.community_can_participate() and public.community_can_view(''post'', post_id))', t);
  end loop;
end $$;
create policy community_post_insert on public.social_posts as restrictive for insert to authenticated with check (
  public.community_can_participate() and (group_id is null or exists(select 1 from public.social_group_members m where m.group_id = social_posts.group_id and m.user_id = auth.uid()))
);
create policy community_post_update on public.social_posts as restrictive for update to authenticated using (public.community_can_participate()) with check (
  group_id is null or exists(select 1 from public.social_group_members m where m.group_id = social_posts.group_id and m.user_id = auth.uid())
);
create policy community_comment_insert on public.social_comments as restrictive for insert to authenticated with check (public.community_can_participate() and public.community_can_view('post', post_id));
create policy community_comment_update on public.social_comments as restrictive for update to authenticated using (public.community_can_participate() and public.community_can_view('post', post_id)) with check (public.community_can_view('post', post_id));
create policy community_member_join on public.social_group_members as restrictive for insert to authenticated with check (public.community_can_participate() and public.community_can_view('group', group_id));
create policy community_follow_insert on public.social_follows as restrictive for insert to authenticated with check (public.community_can_participate() and public.community_can_view('profile', following_id));
create policy community_follow_read on public.social_follows as restrictive for select to authenticated using (not public.community_is_blocked(follower_id) and not public.community_is_blocked(following_id));

create function public.community_accept_terms(p_version text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Faça login.' using errcode = '42501'; end if;
  if not exists(select 1 from public.community_policy where version = p_version and enabled) then raise exception 'As regras mudaram. Atualize a tela.'; end if;
  insert into public.community_acceptances(user_id, version) values(auth.uid(), p_version) on conflict do nothing;
end;
$$;
create function public.community_set_block(p_user uuid, p_blocked boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_user = auth.uid() then raise exception 'Usuário inválido.' using errcode = '42501'; end if;
  if p_blocked then
    if not exists(select 1 from auth.users where id = p_user) then raise exception 'Usuário indisponível.'; end if;
    insert into public.community_blocks(blocker_id, blocked_id) values(auth.uid(), p_user) on conflict do nothing;
  else delete from public.community_blocks where blocker_id = auth.uid() and blocked_id = p_user;
  end if;
end;
$$;
create function public.community_report(p_kind text, p_id uuid, p_reason text, p_details text default '') returns uuid
language plpgsql security definer set search_path = '' as $$
declare r community_private.reviews; result uuid;
begin
  if auth.uid() is null then raise exception 'Faça login.' using errcode = '42501'; end if;
  if not public.community_can_view(p_kind, p_id) and not (
    p_kind = 'profile' and exists(select 1 from community_private.reviews v where v.author_id = p_id and v.kind in ('post','comment') and public.community_can_view(v.kind, v.content_id))
  ) then raise exception 'Conteúdo indisponível.' using errcode = '42501'; end if;
  select * into r from community_private.reviews where kind = p_kind and content_id = p_id;
  if not found then raise exception 'Conteúdo indisponível.'; end if;
  if r.author_id = auth.uid() then raise exception 'Você não pode denunciar seu próprio conteúdo.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 19));
  if (select count(*) from public.community_reports where reporter_id = auth.uid() and created_at > now() - interval '1 hour') >= 20 then raise exception 'Limite de denúncias atingido. Use o contato de suporte para urgências.'; end if;
  select id into result from public.community_reports where reporter_id = auth.uid() and kind = p_kind and content_id = p_id and status = 'open' limit 1;
  if result is not null then return result; end if;
  insert into public.community_reports(reporter_id, kind, content_id, reason, details)
  values(auth.uid(), p_kind, p_id, p_reason, coalesce(p_details, '')) returning id into result;
  insert into community_private.report_evidence(report_id, snapshot) values(result, r.snapshot);
  return result;
end;
$$;
create function public.community_my_status() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'suspended', exists(select 1 from community_private.suspensions where user_id = auth.uid()),
    'moderator', public.community_is_moderator(),
    'reviews', coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'id', content_id, 'status', status)) from community_private.reviews where author_id = auth.uid()), '[]'::jsonb)
  );
$$;

create function public.community_moderation_queue() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.community_is_moderator() then raise exception 'Acesso restrito à moderação.' using errcode = '42501'; end if;
  return jsonb_build_object(
    'suspensions', coalesce((select jsonb_agg(jsonb_build_object('kind','profile','content_id',s.user_id,'author_id',s.user_id,'snapshot',coalesce(r.snapshot,'{}'::jsonb),'revision',0,'reason',s.reason,'created_at',s.created_at)) from community_private.suspensions s left join community_private.reviews r on r.kind='profile' and r.content_id=s.user_id), '[]'::jsonb),
    'reviews', coalesce((select jsonb_agg(to_jsonb(q)) from (select * from community_private.reviews where status = 'pending' and not deleted order by updated_at limit 100) q), '[]'::jsonb),
    'reports', coalesce((select jsonb_agg(to_jsonb(q)) from (
      select r.*, e.snapshot, v.author_id, v.revision from public.community_reports r join community_private.report_evidence e on e.report_id = r.id
      left join community_private.reviews v on v.kind = r.kind and v.content_id = r.content_id
      where r.status = 'open' order by (r.reason = 'child_safety') desc, r.created_at limit 100
    ) q), '[]'::jsonb)
  );
end;
$$;
create function public.community_moderate(p_kind text, p_id uuid, p_revision bigint, p_action text, p_reason text, p_report uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare r community_private.reviews;
begin
  if not public.community_is_moderator() then raise exception 'Acesso restrito à moderação.' using errcode = '42501'; end if;
  if p_action not in ('approve','reject','suspend','dismiss') or char_length(btrim(p_reason)) not between 3 and 1000 then raise exception 'Informe uma ação e justificativa válidas.'; end if;
  select * into r from community_private.reviews where kind = p_kind and content_id = p_id for update;
  if not found or r.revision <> p_revision then raise exception 'O conteúdo mudou. Atualize a fila antes de decidir.'; end if;
  if p_action = 'approve' and not community_private.valid_media(r.snapshot, r.author_id) then raise exception 'A mídia precisa ser reenviada por um canal aprovado antes da revisão.'; end if;
  if r.deleted and p_action = 'approve' then raise exception 'O conteúdo foi excluído.'; end if;
  if r.author_id = auth.uid() then raise exception 'Outro moderador precisa revisar seu conteúdo.'; end if;
  if p_report is not null and not exists(select 1 from public.community_reports where id = p_report and kind = p_kind and content_id = p_id and status = 'open') then raise exception 'Denúncia já tratada ou inválida.'; end if;
  if p_action = 'dismiss' and p_report is null then raise exception 'Selecione uma denúncia.'; end if;
  if p_action in ('approve','reject','suspend') then
    update community_private.reviews set status = case when p_action = 'approve' then 'approved' else 'rejected' end,
      revision = revision + 1, updated_at = now() where kind = p_kind and content_id = p_id;
  end if;
  if p_action = 'suspend' then
    if r.author_id is null then raise exception 'Este conteúdo não possui autor.'; end if;
    insert into community_private.suspensions(user_id, moderator_id, reason) values(r.author_id, auth.uid(), p_reason)
    on conflict(user_id) do update set moderator_id = auth.uid(), reason = excluded.reason;
  end if;
  if p_report is not null then
    update public.community_reports set status = case when p_action = 'dismiss' then 'dismissed' else 'resolved' end, resolved_at = now() where id = p_report;
  end if;
  insert into community_private.audit(moderator_id, kind, content_id, action, reason) values(auth.uid(), p_kind, p_id, p_action, p_reason);
end;
$$;

create function public.community_restore_user(p_user uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.community_is_moderator() then raise exception 'Acesso restrito à moderação.' using errcode = '42501'; end if;
  if p_user = auth.uid() or char_length(btrim(p_reason)) not between 3 and 1000 then raise exception 'Informe usuário e justificativa válidos.'; end if;
  delete from community_private.suspensions where user_id = p_user;
  if not found then raise exception 'Esta conta não está suspensa. Atualize a fila.'; end if;
  insert into community_private.audit(moderator_id, kind, content_id, action, reason) values(auth.uid(), 'profile', p_user, 'restore', p_reason);
end;
$$;
revoke all on function public.community_restore_user(uuid,text) from public, anon;
grant execute on function public.community_restore_user(uuid,text) to authenticated;

-- Existing Web uploads already use a fresh UUID and upsert:false. Deny replacing
-- or deleting media from clients; removal of reported files is an operator action.
create policy community_media_no_replace on storage.objects as restrictive for update to authenticated
  using (bucket_id <> 'social-media') with check (bucket_id <> 'social-media');
create policy community_media_no_delete on storage.objects as restrictive for delete to authenticated
  using (bucket_id <> 'social-media');
create policy community_media_consent on storage.objects as restrictive for insert to authenticated
  with check (bucket_id <> 'social-media' or public.community_can_participate());

-- No anonymous execution, private-table access, self-promotion or client-set moderation status.
revoke all on all tables in schema community_private from public, anon, authenticated;
revoke all on all functions in schema community_private from public, anon, authenticated;
revoke all on function public.community_is_moderator(), public.community_is_blocked(uuid), public.community_can_participate(), public.community_can_view(text,uuid), public.community_accept_terms(text), public.community_set_block(uuid,boolean), public.community_report(text,uuid,text,text), public.community_my_status(), public.community_moderation_queue(), public.community_moderate(text,uuid,bigint,text,text,uuid) from public, anon;
grant execute on function public.community_is_moderator(), public.community_is_blocked(uuid), public.community_can_participate(), public.community_can_view(text,uuid), public.community_accept_terms(text), public.community_set_block(uuid,boolean), public.community_report(text,uuid,text,text), public.community_my_status(), public.community_moderation_queue(), public.community_moderate(text,uuid,bigint,text,text,uuid) to authenticated;

commit;
