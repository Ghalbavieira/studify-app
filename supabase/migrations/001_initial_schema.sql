begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 100),
  timezone text not null default 'America/Sao_Paulo',
  data_version bigint not null default 0 check (data_version >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  exam_date date,
  weekly_minutes integer not null default 600 check (weekly_minutes between 10 and 10080),
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create unique index goals_one_active_per_user on public.goals(user_id) where is_active;

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  goal_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  weight numeric(6,2) not null default 1 check (weight > 0 and weight <= 100),
  color text not null default 'blue' check (color in ('blue','violet','orange','green','amber','pink')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, user_id), unique (id, user_id, goal_id),
  foreign key (goal_id, user_id) references public.goals(id, user_id) on delete cascade
);
create unique index subjects_name_per_goal on public.subjects(goal_id, lower(btrim(name)));
create index subjects_owner_goal on public.subjects(user_id, goal_id);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  goal_id uuid not null, subject_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  completed boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, user_id), unique (id, user_id, subject_id),
  foreign key (subject_id, user_id, goal_id) references public.subjects(id, user_id, goal_id) on delete cascade
);
create index topics_owner_subject on public.topics(user_id, subject_id);
create index topics_subject_goal on public.topics(subject_id, user_id, goal_id);

create table public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  goal_id uuid not null,
  week_start date not null check (extract(dow from week_start) = 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, goal_id, week_start), unique (id, user_id, goal_id, week_start),
  foreign key (goal_id, user_id) references public.goals(id, user_id) on delete cascade
);
create index weekly_plans_goal_owner on public.weekly_plans(goal_id, user_id);

create table public.study_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  goal_id uuid not null, weekly_plan_id uuid not null, week_start date not null,
  subject_id uuid not null, topic_id uuid,
  planned_date date not null check (planned_date between week_start and week_start + 6),
  planned_minutes integer not null check (planned_minutes between 1 and 1440),
  planned_questions integer not null default 0 check (planned_questions between 0 and 100000),
  session_type text not null default 'study' check (session_type in ('study','questions','review','recall')),
  description text not null default '' check (char_length(description) <= 2000),
  position integer not null default 0 check (position >= 0),
  completed boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, user_id), unique (id, user_id, subject_id),
  foreign key (weekly_plan_id, user_id, goal_id, week_start) references public.weekly_plans(id, user_id, goal_id, week_start) on delete cascade,
  foreign key (subject_id, user_id, goal_id) references public.subjects(id, user_id, goal_id),
  foreign key (topic_id, user_id, subject_id) references public.topics(id, user_id, subject_id)
);
create index study_blocks_owner_date_position on public.study_blocks(user_id, planned_date, position);
create index study_blocks_plan_scope on public.study_blocks(weekly_plan_id, user_id, goal_id, week_start);
create index study_blocks_subject_scope on public.study_blocks(subject_id, user_id, goal_id);
create index study_blocks_topic_scope on public.study_blocks(topic_id, user_id, subject_id) where topic_id is not null;

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  goal_id uuid not null, subject_id uuid not null, topic_id uuid, study_block_id uuid,
  session_type text not null default 'study' check (session_type in ('study','questions','review','recall')),
  started_at timestamptz not null, ended_at timestamptz,
  elapsed_seconds integer not null default 0 check (elapsed_seconds between 0 and 86400),
  status text not null default 'in_progress' check (status in ('in_progress','paused','completed','cancelled')),
  manual_questions_count integer not null default 0 check (manual_questions_count between 0 and 100000),
  manual_correct_count integer not null default 0 check (manual_correct_count between 0 and manual_questions_count),
  notes text not null default '' check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at),
  check (status <> 'completed' or (ended_at is not null and elapsed_seconds > 0)),
  unique (id, user_id), unique (id, user_id, subject_id),
  foreign key (subject_id, user_id, goal_id) references public.subjects(id, user_id, goal_id),
  foreign key (topic_id, user_id, subject_id) references public.topics(id, user_id, subject_id),
  foreign key (study_block_id, user_id, subject_id) references public.study_blocks(id, user_id, subject_id) on delete set null (study_block_id)
);
create index study_sessions_owner_ended on public.study_sessions(user_id, ended_at desc);
create index study_sessions_subject_ended on public.study_sessions(subject_id, user_id, ended_at desc);
create index study_sessions_subject_goal on public.study_sessions(subject_id, user_id, goal_id);
create index study_sessions_topic_scope on public.study_sessions(topic_id, user_id, subject_id) where topic_id is not null;
create index study_sessions_block_scope on public.study_sessions(study_block_id, user_id, subject_id) where study_block_id is not null;

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  subject_id uuid not null, topic_id uuid, source_session_id uuid not null,
  due_date date not null, interval_days integer not null default 1 check (interval_days between 1 and 90),
  completed_at timestamptz, outcome text check (outcome in ('difficult','good','easy')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((completed_at is null) = (outcome is null)),
  unique (id, user_id),
  foreign key (subject_id, user_id) references public.subjects(id, user_id),
  foreign key (topic_id, user_id, subject_id) references public.topics(id, user_id, subject_id),
  foreign key (source_session_id, user_id, subject_id) references public.study_sessions(id, user_id, subject_id)
);
create index reviews_owner_due on public.reviews(user_id, due_date) where completed_at is null;
create index reviews_subject_owner on public.reviews(subject_id, user_id);
create index reviews_topic_scope on public.reviews(topic_id, user_id, subject_id) where topic_id is not null;
create index reviews_source_scope on public.reviews(source_session_id, user_id, subject_id);

create table public.recalls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  subject_id uuid not null, topic_id uuid, source_session_id uuid not null,
  due_date date not null, interval_days integer not null default 3 check (interval_days between 1 and 90),
  prompt text not null default '', response text not null default '',
  completed_at timestamptz, outcome text check (outcome in ('difficult','good','easy')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((completed_at is null) = (outcome is null)),
  unique (id, user_id),
  foreign key (subject_id, user_id) references public.subjects(id, user_id),
  foreign key (topic_id, user_id, subject_id) references public.topics(id, user_id, subject_id),
  foreign key (source_session_id, user_id, subject_id) references public.study_sessions(id, user_id, subject_id)
);
create index recalls_owner_due on public.recalls(user_id, due_date) where completed_at is null;
create index recalls_subject_owner on public.recalls(subject_id, user_id);
create index recalls_topic_scope on public.recalls(topic_id, user_id, subject_id) where topic_id is not null;
create index recalls_source_scope on public.recalls(source_session_id, user_id, subject_id);

create table public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  goal_id uuid not null,
  engine_version text not null,
  calculated_context jsonb not null check (jsonb_typeof(calculated_context) = 'object'),
  explanation text not null,
  explanation_source text not null default 'deterministic' check (explanation_source in ('deterministic','llm')),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (goal_id, user_id) references public.goals(id, user_id) on delete cascade
);
create index ai_recommendations_owner_created on public.ai_recommendations(user_id, created_at desc);
create index ai_recommendations_goal_scope on public.ai_recommendations(goal_id, user_id);

create table public.plan_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  recommendation_id uuid,
  proposed_changes jsonb not null check (jsonb_typeof(proposed_changes) = 'array'),
  status text not null default 'pending' check (status in ('pending','accepted','dismissed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (recommendation_id, user_id) references public.ai_recommendations(id, user_id) on delete set null (recommendation_id)
);
create index plan_adjustments_owner_status on public.plan_adjustments(user_id, status);
create index plan_adjustments_recommendation_scope on public.plan_adjustments(recommendation_id, user_id);

create table public.exam_boards (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now()
);
create table public.exams (
  id uuid primary key default gen_random_uuid(),
  exam_board_id uuid not null references public.exam_boards(id),
  organization text not null, role text not null,
  year integer not null check (year between 1900 and 2200),
  source_url text,
  created_at timestamptz not null default now()
);
create index exams_board_year on public.exams(exam_board_id, year);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  exam_id uuid references public.exams(id),
  subject_id uuid, topic_id uuid,
  subject_label text not null default '', topic_label text not null default '',
  statement text not null check (char_length(btrim(statement)) between 1 and 20000),
  explanation text check (char_length(explanation) <= 20000),
  difficulty text check (difficulty in ('easy','medium','hard')),
  source_type text not null check (source_type in ('own','licensed','official')),
  source_reference text,
  visibility text not null default 'private' check (visibility in ('private','public')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (user_id is not null or visibility = 'public'),
  check (user_id is not null or (subject_id is null and topic_id is null)),
  check (topic_id is null or subject_id is not null),
  foreign key (subject_id, user_id) references public.subjects(id, user_id),
  foreign key (topic_id, user_id, subject_id) references public.topics(id, user_id, subject_id)
);
create index questions_exam on public.questions(exam_id);
create index questions_subject on public.questions(subject_id, user_id);
create index questions_topic on public.questions(topic_id, user_id, subject_id);
create index questions_catalog on public.questions(visibility, subject_label, topic_label);
create index questions_owner on public.questions(user_id) where user_id is not null;

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label text not null check (label ~ '^[A-Z]$'),
  text text not null check (char_length(btrim(text)) between 1 and 10000),
  is_correct boolean not null default false,
  unique (question_id, label), unique (id, question_id)
);
create unique index question_one_correct_option on public.question_options(question_id) where is_correct;

create table public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  study_session_id uuid,
  subject_id uuid, topic_id uuid,
  selected_option_id uuid,
  is_correct boolean not null,
  response_time_seconds integer check (response_time_seconds between 0 and 86400),
  answered_at timestamptz not null default now(),
  request_id uuid not null,
  unique (user_id, request_id),
  check (topic_id is null or subject_id is not null),
  foreign key (selected_option_id, question_id) references public.question_options(id, question_id),
  foreign key (study_session_id, user_id) references public.study_sessions(id, user_id),
  foreign key (subject_id, user_id) references public.subjects(id, user_id),
  foreign key (topic_id, user_id, subject_id) references public.topics(id, user_id, subject_id)
);
create index question_attempts_owner_answered on public.question_attempts(user_id, answered_at desc);
create index question_attempts_subject_answered on public.question_attempts(subject_id, user_id, answered_at desc);
create index question_attempts_topic_answered on public.question_attempts(topic_id, user_id, subject_id, answered_at desc);
create index question_attempts_question on public.question_attempts(question_id);
create index question_attempts_option on public.question_attempts(selected_option_id, question_id);
create index question_attempts_session on public.question_attempts(study_session_id, user_id);

create function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
revoke all on function public.set_updated_at() from public, anon, authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','goals','subjects','topics','weekly_plans','study_blocks','study_sessions','reviews','recalls','plan_adjustments','questions'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name);
  end loop;
  foreach table_name in array array['goals','subjects','topics','weekly_plans','study_blocks','study_sessions','reviews','recalls','ai_recommendations','plan_adjustments'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('create policy owner_select on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name);
    execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name);
    execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name);
    execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name);
  end loop;
end;
$$;

alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
create policy owner_select on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy owner_insert on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy owner_update on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create function public.create_user_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name) values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 100));
  return new;
end;
$$;
revoke all on function public.create_user_profile() from public, anon, authenticated;
create trigger create_user_profile after insert on auth.users for each row execute function public.create_user_profile();
insert into public.profiles (id, display_name) select id, left(coalesce(raw_user_meta_data ->> 'display_name', ''), 100) from auth.users on conflict (id) do nothing;

alter table public.exam_boards enable row level security;
alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.question_attempts enable row level security;
revoke all on public.exam_boards, public.exams, public.questions, public.question_options, public.question_attempts from public, anon, authenticated;
grant select on public.exam_boards, public.exams to authenticated;
create policy catalog_select on public.exam_boards for select to authenticated using (true);
create policy catalog_select on public.exams for select to authenticated using (true);
grant select (id, user_id, exam_id, subject_id, topic_id, subject_label, topic_label, statement, difficulty, source_type, source_reference, visibility, created_at, updated_at) on public.questions to authenticated;
create policy visible_questions on public.questions for select to authenticated using (visibility = 'public' or user_id = (select auth.uid()));
grant select (id, question_id, label, text) on public.question_options to authenticated;
create policy visible_options on public.question_options for select to authenticated using (exists (select 1 from public.questions q where q.id = question_id and (q.visibility = 'public' or q.user_id = (select auth.uid()))));
grant select on public.question_attempts to authenticated;
create policy owner_select on public.question_attempts for select to authenticated using (user_id = (select auth.uid()));

grant usage on schema public to authenticated;

create function public.answer_question(
  p_question_id uuid, p_selected_option_id uuid, p_request_id uuid,
  p_study_session_id uuid default null, p_subject_id uuid default null, p_topic_id uuid default null,
  p_response_time_seconds integer default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid(); question_record public.questions; attempt public.question_attempts;
  selected_correct boolean; correct_option uuid; chosen_subject uuid := p_subject_id; chosen_topic uuid := p_topic_id;
begin
  if caller is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_request_id is null then raise exception 'Request ID required' using errcode = '22023'; end if;
  select * into question_record from public.questions where id = p_question_id and (visibility = 'public' or user_id = caller);
  if not found then raise exception 'Question unavailable' using errcode = '42501'; end if;
  select id into correct_option from public.question_options where question_id = p_question_id and is_correct;
  if correct_option is null then raise exception 'Question has no answer key' using errcode = '22023'; end if;
  select is_correct into selected_correct from public.question_options where id = p_selected_option_id and question_id = p_question_id;
  if not found then raise exception 'Option does not belong to question' using errcode = '22023'; end if;
  if p_study_session_id is not null then
    select subject_id, topic_id into chosen_subject, chosen_topic from public.study_sessions where id = p_study_session_id and user_id = caller;
    if not found then raise exception 'Session unavailable' using errcode = '42501'; end if;
    chosen_topic := coalesce(p_topic_id, chosen_topic);
  end if;
  if chosen_subject is not null and not exists (select 1 from public.subjects where id = chosen_subject and user_id = caller) then raise exception 'Subject unavailable' using errcode = '42501'; end if;
  if chosen_topic is not null and not exists (select 1 from public.topics where id = chosen_topic and subject_id = chosen_subject and user_id = caller) then raise exception 'Topic unavailable' using errcode = '42501'; end if;
  insert into public.question_attempts (user_id, question_id, selected_option_id, is_correct, request_id, study_session_id, subject_id, topic_id, response_time_seconds)
  values (caller, p_question_id, p_selected_option_id, selected_correct, p_request_id, p_study_session_id, chosen_subject, chosen_topic, p_response_time_seconds)
  on conflict (user_id, request_id) do nothing;
  select * into attempt from public.question_attempts where user_id = caller and request_id = p_request_id;
  if attempt.question_id <> p_question_id or attempt.selected_option_id <> p_selected_option_id then raise exception 'Request ID already used' using errcode = '22023'; end if;
  return jsonb_build_object('attempt', to_jsonb(attempt), 'correct_option_id', correct_option, 'explanation', question_record.explanation);
end;
$$;
revoke all on function public.answer_question(uuid, uuid, uuid, uuid, uuid, uuid, integer) from public, anon;
grant execute on function public.answer_question(uuid, uuid, uuid, uuid, uuid, uuid, integer) to authenticated;

create function public.validate_question_options() returns trigger language plpgsql set search_path = '' as $$
declare qid uuid; option_count integer; correct_count integer;
begin
  if tg_table_name = 'questions' then qid := coalesce(new.id, old.id);
  else qid := coalesce(new.question_id, old.question_id); end if;
  if exists (select 1 from public.questions where id = qid) then
    select count(*), count(*) filter (where is_correct) into option_count, correct_count from public.question_options where question_id = qid;
    if option_count < 2 or correct_count <> 1 then raise exception 'A question requires at least two options and exactly one correct answer' using errcode = '23514'; end if;
  end if;
  return null;
end;
$$;
revoke all on function public.validate_question_options() from public, anon, authenticated;
create constraint trigger question_options_complete after insert or update or delete on public.question_options deferrable initially deferred for each row execute function public.validate_question_options();
create constraint trigger question_has_options after insert or update on public.questions deferrable initially deferred for each row execute function public.validate_question_options();

commit;
