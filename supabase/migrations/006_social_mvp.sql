begin;

create table if not exists public.social_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 40),
  display_name text not null default '' check (char_length(display_name) <= 100),
  bio text not null default '' check (char_length(bio) <= 280),
  objective text not null default '' check (char_length(objective) <= 160),
  avatar_url text,
  avatar_alt text,
  subjects text[] not null default '{}',
  studied_seconds bigint check (studied_seconds is null or studied_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (char_length(slug) between 1 and 80),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 1000),
  privacy text not null default 'public' check (privacy in ('public','private')),
  objective text not null default '' check (char_length(objective) <= 160),
  subjects text[] not null default '{}',
  rules text not null default '' check (char_length(rules) <= 2000),
  cover_url text,
  cover_alt text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_group_members (
  group_id uuid not null references public.social_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null default '' check (char_length(text) <= 1000),
  media_url text,
  media_alt text,
  subject text,
  topic text,
  objective text,
  metrics jsonb,
  group_id uuid references public.social_groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(btrim(text)) > 0 or media_url is not null)
);

create table if not exists public.social_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null default '' check (char_length(text) <= 1000),
  media_url text,
  media_alt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(btrim(text)) > 0 or media_url is not null)
);

create table if not exists public.social_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.social_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.social_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.social_reposts (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.social_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.social_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.social_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists social_posts_created_idx on public.social_posts(created_at desc);
create index if not exists social_posts_group_idx on public.social_posts(group_id, created_at desc);
create index if not exists social_comments_post_idx on public.social_comments(post_id, created_at);
create index if not exists social_group_members_user_idx on public.social_group_members(user_id, joined_at desc);

alter table public.social_profiles enable row level security;
alter table public.social_groups enable row level security;
alter table public.social_group_members enable row level security;
alter table public.social_posts enable row level security;
alter table public.social_comments enable row level security;
alter table public.social_follows enable row level security;
alter table public.social_likes enable row level security;
alter table public.social_reposts enable row level security;
alter table public.social_bookmarks enable row level security;

create policy social_profiles_read on public.social_profiles for select to authenticated using (true);
create policy social_profiles_insert_own on public.social_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy social_profiles_update_own on public.social_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy social_groups_read on public.social_groups for select to authenticated using (
  privacy = 'public'
  or created_by = (select auth.uid())
  or exists (select 1 from public.social_group_members m where m.group_id = id and m.user_id = (select auth.uid()))
);
create policy social_groups_insert on public.social_groups for insert to authenticated with check (created_by = (select auth.uid()));
create policy social_groups_update_owner on public.social_groups for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy social_groups_delete_owner on public.social_groups for delete to authenticated using (created_by = (select auth.uid()));

create policy social_group_members_read on public.social_group_members for select to authenticated using (true);
create policy social_group_members_join on public.social_group_members for insert to authenticated with check (
  user_id = (select auth.uid())
  and (
    role = 'member' and exists (select 1 from public.social_groups g where g.id = group_id and g.privacy = 'public')
    or role = 'owner' and exists (select 1 from public.social_groups g where g.id = group_id and g.created_by = (select auth.uid()))
  )
);
create policy social_group_members_leave on public.social_group_members for delete to authenticated using (user_id = (select auth.uid()) and role <> 'owner');

create policy social_posts_read on public.social_posts for select to authenticated using (
  group_id is null
  or exists (select 1 from public.social_groups g where g.id = group_id and g.privacy = 'public')
  or exists (select 1 from public.social_group_members m where m.group_id = social_posts.group_id and m.user_id = (select auth.uid()))
);
create policy social_posts_insert on public.social_posts for insert to authenticated with check (
  user_id = (select auth.uid())
  and (
    group_id is null
    or exists (select 1 from public.social_group_members m where m.group_id = social_posts.group_id and m.user_id = (select auth.uid()))
  )
);
create policy social_posts_update_own on public.social_posts for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy social_posts_delete_own on public.social_posts for delete to authenticated using (user_id = (select auth.uid()));

create policy social_comments_read on public.social_comments for select to authenticated using (
  exists (
    select 1 from public.social_posts p
    where p.id = post_id and (
      p.group_id is null
      or exists (select 1 from public.social_groups g where g.id = p.group_id and g.privacy = 'public')
      or exists (select 1 from public.social_group_members m where m.group_id = p.group_id and m.user_id = (select auth.uid()))
    )
  )
);
create policy social_comments_insert on public.social_comments for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.social_posts p
    where p.id = post_id and (
      p.group_id is null
      or exists (select 1 from public.social_groups g where g.id = p.group_id and g.privacy = 'public')
      or exists (select 1 from public.social_group_members m where m.group_id = p.group_id and m.user_id = (select auth.uid()))
    )
  )
);
create policy social_comments_update_own on public.social_comments for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy social_comments_delete_own on public.social_comments for delete to authenticated using (user_id = (select auth.uid()));

create policy social_follows_read on public.social_follows for select to authenticated using (true);
create policy social_follows_insert on public.social_follows for insert to authenticated with check (follower_id = (select auth.uid()));
create policy social_follows_delete on public.social_follows for delete to authenticated using (follower_id = (select auth.uid()));

create policy social_likes_read on public.social_likes for select to authenticated using (true);
create policy social_likes_insert on public.social_likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy social_likes_delete on public.social_likes for delete to authenticated using (user_id = (select auth.uid()));

create policy social_reposts_read on public.social_reposts for select to authenticated using (true);
create policy social_reposts_insert on public.social_reposts for insert to authenticated with check (user_id = (select auth.uid()));
create policy social_reposts_delete on public.social_reposts for delete to authenticated using (user_id = (select auth.uid()));

create policy social_bookmarks_read on public.social_bookmarks for select to authenticated using (user_id = (select auth.uid()));
create policy social_bookmarks_insert on public.social_bookmarks for insert to authenticated with check (user_id = (select auth.uid()));
create policy social_bookmarks_delete on public.social_bookmarks for delete to authenticated using (user_id = (select auth.uid()));

insert into public.social_groups (id, slug, name, description, privacy, objective, subjects, rules, created_by)
values
  ('00000000-0000-4000-8000-000000000101', 'dataprev-2026', 'Dataprev 2026', 'Preparação focada em tecnologia, segurança e execução até a prova.', 'public', 'Dataprev 2026', array['Redes','Segurança','Cloud'], 'Compartilhe estudo real, dúvidas específicas e materiais próprios.', null),
  ('00000000-0000-4000-8000-000000000102', 'oab', 'OAB', 'Revisões, questões e organização para a preparação da OAB.', 'public', 'OAB', array['Direito'], 'Respeito nas discussões e foco no estudo.', null),
  ('00000000-0000-4000-8000-000000000103', 'enem', 'ENEM', 'Rotina, revisão e prática para quem está se preparando para o ENEM.', 'public', 'ENEM', array['Matemática','Linguagens'], 'Sem spam. Compartilhe o que ajuda a estudar melhor.', null),
  ('00000000-0000-4000-8000-000000000104', 'seguranca-cibernetica', 'Segurança Cibernética', 'AppSec, redes, IAM, cloud e fundamentos de defesa.', 'public', 'Cybersecurity', array['Segurança','Redes'], 'Conteúdo educacional e seguro. Não publicar credenciais ou dados sensíveis.', null),
  ('00000000-0000-4000-8000-000000000105', 'front-end-react', 'Front-end / React', 'Estudo prático de React, JavaScript e interfaces.', 'public', 'Front-end', array['React','JavaScript'], 'Dúvidas objetivas, exemplos reproduzíveis e troca respeitosa.', null)
on conflict (slug) do nothing;

commit;
