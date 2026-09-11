begin;

alter table public.goals add column if not exists board text;
alter table public.goals add column if not exists organization text;
alter table public.goals add column if not exists role text;
alter table public.goals add column if not exists questions_total integer check (questions_total is null or questions_total between 0 and 10000);
alter table public.goals add column if not exists cutoff_score numeric(10,2) check (cutoff_score is null or cutoff_score >= 0);
alter table public.subjects add column if not exists question_count integer check (question_count is null or question_count between 0 and 10000);

create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  goal_id uuid not null,
  log_date date not null,
  note text not null default '' check (char_length(note) <= 6000),
  energy smallint check (energy is null or energy between 1 and 5),
  focus smallint check (focus is null or focus between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, goal_id, log_date),
  foreign key (goal_id, user_id) references public.goals(id, user_id) on delete cascade
);
create index if not exists daily_logs_owner_date on public.daily_logs(user_id, log_date desc);
alter table public.daily_logs enable row level security;
revoke all on public.daily_logs from public, anon, authenticated;
grant select, insert, update, delete on public.daily_logs to authenticated;
drop policy if exists owner_select on public.daily_logs;
drop policy if exists owner_insert on public.daily_logs;
drop policy if exists owner_update on public.daily_logs;
drop policy if exists owner_delete on public.daily_logs;
create policy owner_select on public.daily_logs for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.daily_logs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_update on public.daily_logs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_delete on public.daily_logs for delete to authenticated using ((select auth.uid()) = user_id);

drop trigger if exists set_updated_at on public.daily_logs;
create trigger set_updated_at before update on public.daily_logs for each row execute function public.set_updated_at();

create or replace function public.get_study_data() returns jsonb language plpgsql security invoker set search_path = '' as $$
declare caller uuid := auth.uid(); active_goal public.goals; profile public.profiles; document jsonb;
begin
  if caller is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into profile from public.profiles where id = caller;
  select * into active_goal from public.goals where user_id = caller and is_active;
  document := jsonb_build_object(
    'version', 1, 'profileName', coalesce(profile.display_name, ''),
    'goal', case when active_goal.id is null then null else jsonb_build_object(
      'id', active_goal.id, 'title', active_goal.title, 'examDate', active_goal.exam_date, 'weeklyMinutes', active_goal.weekly_minutes,
      'board', coalesce(active_goal.board, ''), 'organization', coalesce(active_goal.organization, ''), 'role', coalesce(active_goal.role, ''),
      'questionsTotal', active_goal.questions_total, 'cutoffScore', active_goal.cutoff_score
    ) end,
    'subjects', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'weight', weight, 'color', color, 'questionCount', question_count) order by created_at, id) from public.subjects where user_id = caller and goal_id = active_goal.id), '[]'::jsonb),
    'topics', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'subjectId', subject_id, 'title', title, 'completed', completed) order by created_at, id) from public.topics where user_id = caller and goal_id = active_goal.id), '[]'::jsonb),
    'blocks', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'date', planned_date, 'subjectId', subject_id, 'topicId', topic_id, 'minutes', planned_minutes, 'description', description, 'done', completed, 'plannedQuestions', planned_questions, 'sessionType', session_type) order by position, id) from public.study_blocks where user_id = caller and goal_id = active_goal.id), '[]'::jsonb),
    'sessions', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'subjectId', subject_id, 'topicId', topic_id, 'blockId', study_block_id, 'taskId', null, 'startedAt', to_char(started_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'endedAt', to_char(ended_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'seconds', elapsed_seconds, 'questions', manual_questions_count, 'correct', manual_correct_count, 'notes', notes) order by ended_at) from public.study_sessions where user_id = caller and goal_id = active_goal.id and status = 'completed'), '[]'::jsonb),
    'tasks', coalesce((select jsonb_agg(task) from (
      select jsonb_build_object('id', r.id, 'kind', 'review', 'subjectId', r.subject_id, 'topicId', r.topic_id, 'sourceSessionId', r.source_session_id, 'dueDate', r.due_date, 'intervalDays', r.interval_days, 'completedAt', to_char(r.completed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'rating', r.outcome) as task from public.reviews r join public.subjects s on s.id = r.subject_id where r.user_id = caller and s.goal_id = active_goal.id
      union all
      select jsonb_build_object('id', r.id, 'kind', 'recall', 'subjectId', r.subject_id, 'topicId', r.topic_id, 'sourceSessionId', r.source_session_id, 'dueDate', r.due_date, 'intervalDays', r.interval_days, 'completedAt', to_char(r.completed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'rating', r.outcome) from public.recalls r join public.subjects s on s.id = r.subject_id where r.user_id = caller and s.goal_id = active_goal.id
    ) all_tasks), '[]'::jsonb),
    'attempts', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'questionId', a.question_id, 'studySessionId', a.study_session_id, 'subjectId', a.subject_id, 'topicId', a.topic_id, 'selectedOptionId', a.selected_option_id, 'isCorrect', a.is_correct, 'responseTimeSeconds', a.response_time_seconds, 'answeredAt', to_char(a.answered_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) order by a.answered_at) from public.question_attempts a left join public.subjects s on s.id = a.subject_id where a.user_id = caller and (a.subject_id is null or s.goal_id = active_goal.id)), '[]'::jsonb)
  );
  return jsonb_build_object('data', document, 'revision', coalesce(profile.data_version, 0));
end;
$$;

create or replace function public.save_study_data(p_expected_revision bigint, p_data jsonb) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare caller uuid := auth.uid(); current_revision bigint; goal_id_value uuid; item jsonb; plan_id uuid; start_date date; position_value integer := 0;
begin
  if caller is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_data ->> 'version' <> '1' or jsonb_typeof(p_data) <> 'object' then raise exception 'Invalid document' using errcode = '22023'; end if;
  select data_version into current_revision from public.profiles where id = caller for update;
  if not found then raise exception 'Profile unavailable' using errcode = '42501'; end if;
  if current_revision <> p_expected_revision then raise exception 'STUDIFY_CONFLICT: data changed on another device; reload before saving' using errcode = '40001'; end if;
  update public.profiles set display_name = coalesce(p_data ->> 'profileName', ''), data_version = data_version + 1 where id = caller;
  if p_data -> 'goal' is null or p_data -> 'goal' = 'null'::jsonb then return public.get_study_data(); end if;
  goal_id_value := (p_data -> 'goal' ->> 'id')::uuid;
  update public.goals set is_active = false where user_id = caller and id <> goal_id_value and is_active;
  insert into public.goals (id, user_id, title, exam_date, weekly_minutes, board, organization, role, questions_total, cutoff_score)
    values (goal_id_value, caller, p_data -> 'goal' ->> 'title', nullif(p_data -> 'goal' ->> 'examDate','')::date, (p_data -> 'goal' ->> 'weeklyMinutes')::integer,
      nullif(p_data -> 'goal' ->> 'board',''), nullif(p_data -> 'goal' ->> 'organization',''), nullif(p_data -> 'goal' ->> 'role',''),
      nullif(p_data -> 'goal' ->> 'questionsTotal','')::integer, nullif(p_data -> 'goal' ->> 'cutoffScore','')::numeric)
    on conflict (id) do update set title = excluded.title, exam_date = excluded.exam_date, weekly_minutes = excluded.weekly_minutes, board = excluded.board, organization = excluded.organization, role = excluded.role, questions_total = excluded.questions_total, cutoff_score = excluded.cutoff_score, is_active = true;
  for item in select value from jsonb_array_elements(p_data -> 'subjects') loop
    insert into public.subjects (id, user_id, goal_id, name, weight, color, question_count)
      values ((item ->> 'id')::uuid, caller, goal_id_value, item ->> 'name', (item ->> 'weight')::numeric, item ->> 'color', nullif(item ->> 'questionCount','')::integer)
      on conflict (id) do update set name = excluded.name, weight = excluded.weight, color = excluded.color, question_count = excluded.question_count;
  end loop;
  for item in select value from jsonb_array_elements(p_data -> 'topics') loop
    insert into public.topics (id, user_id, goal_id, subject_id, title, completed)
      values ((item ->> 'id')::uuid, caller, goal_id_value, (item ->> 'subjectId')::uuid, item ->> 'title', (item ->> 'completed')::boolean)
      on conflict (id) do update set title = excluded.title, completed = excluded.completed;
  end loop;
  for item in select value from jsonb_array_elements(p_data -> 'blocks') loop
    start_date := (item ->> 'date')::date - extract(dow from (item ->> 'date')::date)::integer;
    insert into public.weekly_plans (user_id, goal_id, week_start) values (caller, goal_id_value, start_date)
      on conflict (user_id, goal_id, week_start) do update set week_start = excluded.week_start returning id into plan_id;
    insert into public.study_blocks (id, user_id, goal_id, weekly_plan_id, week_start, subject_id, topic_id, planned_date, planned_minutes, planned_questions, session_type, description, completed, position)
      values ((item ->> 'id')::uuid, caller, goal_id_value, plan_id, start_date, (item ->> 'subjectId')::uuid, nullif(item ->> 'topicId','')::uuid, (item ->> 'date')::date, (item ->> 'minutes')::integer, coalesce((item ->> 'plannedQuestions')::integer, 0), coalesce(item ->> 'sessionType', 'study'), item ->> 'description', (item ->> 'done')::boolean, position_value)
      on conflict (id) do update set weekly_plan_id = excluded.weekly_plan_id, week_start = excluded.week_start, subject_id = excluded.subject_id, topic_id = excluded.topic_id, planned_date = excluded.planned_date, planned_minutes = excluded.planned_minutes, planned_questions = excluded.planned_questions, session_type = excluded.session_type, description = excluded.description, completed = excluded.completed, position = excluded.position;
    position_value := position_value + 1;
  end loop;
  for item in select value from jsonb_array_elements(p_data -> 'sessions') loop
    insert into public.study_sessions (id, user_id, goal_id, subject_id, topic_id, study_block_id, started_at, ended_at, elapsed_seconds, status, manual_questions_count, manual_correct_count, notes)
      values ((item ->> 'id')::uuid, caller, goal_id_value, (item ->> 'subjectId')::uuid, nullif(item ->> 'topicId','')::uuid, nullif(item ->> 'blockId','')::uuid, (item ->> 'startedAt')::timestamptz, (item ->> 'endedAt')::timestamptz, (item ->> 'seconds')::integer, 'completed', (item ->> 'questions')::integer, (item ->> 'correct')::integer, item ->> 'notes')
      on conflict (id) do update set ended_at = excluded.ended_at, elapsed_seconds = excluded.elapsed_seconds, status = excluded.status, manual_questions_count = excluded.manual_questions_count, manual_correct_count = excluded.manual_correct_count, notes = excluded.notes where public.study_sessions.status <> 'completed';
  end loop;
  for item in select value from jsonb_array_elements(p_data -> 'tasks') loop
    if item ->> 'kind' not in ('review','recall') then raise exception 'Invalid task kind' using errcode = '22023'; end if;
    execute format('insert into public.%I (id,user_id,subject_id,topic_id,source_session_id,due_date,interval_days,completed_at,outcome) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict (id) do update set due_date = excluded.due_date, interval_days = excluded.interval_days, completed_at = excluded.completed_at, outcome = excluded.outcome', case when item ->> 'kind' = 'review' then 'reviews' else 'recalls' end)
      using (item ->> 'id')::uuid, caller, (item ->> 'subjectId')::uuid, nullif(item ->> 'topicId','')::uuid, (item ->> 'sourceSessionId')::uuid, (item ->> 'dueDate')::date, (item ->> 'intervalDays')::integer, nullif(item ->> 'completedAt','')::timestamptz, item ->> 'rating';
  end loop;
  delete from public.study_blocks where user_id = caller and goal_id = goal_id_value and id not in (select (value ->> 'id')::uuid from jsonb_array_elements(p_data -> 'blocks'));
  return public.get_study_data();
end;
$$;

commit;
