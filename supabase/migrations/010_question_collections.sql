begin;
-- References the existing catalog and attempts; no copied questions or answer keys.
create table public.question_sets (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 goal_id uuid not null, subject_id uuid not null, topic_id uuid,
 title text not null check(char_length(btrim(title)) between 1 and 160),
 kind text not null check(kind in ('list','simulation')),
 question_ids uuid[] not null check(cardinality(question_ids) between 1 and 200),
 created_at timestamptz not null default now(), unique(id,user_id),
 foreign key(goal_id,user_id) references public.goals(id,user_id),
 foreign key(subject_id,user_id,goal_id) references public.subjects(id,user_id,goal_id),
 foreign key(topic_id,user_id,subject_id) references public.topics(id,user_id,subject_id)
);
create table public.question_runs (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 set_id uuid not null, parent_run_id uuid, question_ids uuid[] not null,
 started_at timestamptz not null default now(), completed_at timestamptz,
 unique(id,user_id),
 foreign key(set_id,user_id) references public.question_sets(id,user_id),
 foreign key(parent_run_id,user_id) references public.question_runs(id,user_id)
);
alter table public.question_attempts add constraint question_attempts_id_owner unique(id,user_id);
create table public.question_run_answers (
 run_id uuid not null, user_id uuid not null, question_id uuid not null references public.questions(id),
 attempt_id uuid not null unique,
 primary key(run_id,question_id),
 foreign key(run_id,user_id) references public.question_runs(id,user_id),
 foreign key(attempt_id,user_id) references public.question_attempts(id,user_id)
);
create table public.question_favorites (
 user_id uuid not null references auth.users(id) on delete cascade,
 question_id uuid not null references public.questions(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(user_id,question_id)
);
do $$ declare t text; begin
 foreach t in array array['question_sets','question_runs','question_run_answers','question_favorites'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy own_read on public.%I for select to authenticated using(user_id=(select auth.uid()))',t);
 end loop;
end $$;
grant insert,delete on public.question_favorites to authenticated;
create policy favorite_add on public.question_favorites for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.questions q where q.id=question_id and (q.visibility='public' or q.user_id=(select auth.uid()))));
create policy favorite_remove on public.question_favorites for delete to authenticated using(user_id=(select auth.uid()));

create function public.create_question_set(p_id uuid,p_goal uuid,p_subject uuid,p_topic uuid,p_title text,p_kind text,p_questions uuid[]) returns uuid
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); existing public.question_sets;
begin
 if caller is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into existing from public.question_sets where id=p_id;
 if found then
  if existing.user_id<>caller or existing.goal_id<>p_goal or existing.subject_id<>p_subject or existing.topic_id is distinct from p_topic or existing.title<>p_title or existing.kind<>p_kind or existing.question_ids<>p_questions then raise exception 'Request ID already used' using errcode='22023'; end if;
  return existing.id;
 end if;
 if p_questions is null or cardinality(p_questions) not between 1 and 200 or (select count(distinct q) from unnest(p_questions) q)<>cardinality(p_questions) then raise exception 'Escolha entre 1 e 200 questões distintas.' using errcode='22023'; end if;
 if (select count(*) from public.questions where id=any(p_questions) and (visibility='public' or user_id=caller))<>cardinality(p_questions) then raise exception 'Question unavailable' using errcode='42501'; end if;
 insert into public.question_sets(id,user_id,goal_id,subject_id,topic_id,title,kind,question_ids) values(p_id,caller,p_goal,p_subject,p_topic,p_title,p_kind,p_questions);
 return p_id;
end $$;
create function public.start_question_run(p_id uuid,p_set uuid,p_parent uuid default null,p_wrong_only boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); collection public.question_sets; ids uuid[];
begin
 if caller is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into collection from public.question_sets where id=p_set and user_id=caller;
 if not found then raise exception 'List unavailable' using errcode='42501'; end if;
 if p_parent is not null and not exists(select 1 from public.question_runs where id=p_parent and set_id=p_set and user_id=caller) then raise exception 'Parent unavailable' using errcode='42501'; end if;
 if exists(select 1 from public.question_runs where id=p_id) then
  if not exists(select 1 from public.question_runs where id=p_id and user_id=caller and set_id=p_set and parent_run_id is not distinct from p_parent) then raise exception 'Request ID already used' using errcode='22023'; end if;
  return p_id;
 end if;
 ids:=collection.question_ids;
 if p_wrong_only then
  if p_parent is null then raise exception 'Parent required' using errcode='22023'; end if;
  select array_agg(a.question_id order by array_position(collection.question_ids,a.question_id)) into ids from public.question_run_answers a join public.question_attempts t on t.id=a.attempt_id where a.run_id=p_parent and a.user_id=caller and not t.is_correct;
  if coalesce(cardinality(ids),0)=0 then raise exception 'Nenhuma questão errada nesta execução.' using errcode='22023'; end if;
 end if;
 insert into public.question_runs(id,user_id,set_id,parent_run_id,question_ids) values(p_id,caller,p_set,p_parent,ids);
 return p_id;
end $$;
create function public.answer_question_run(p_run uuid,p_question uuid,p_option uuid,p_request uuid,p_seconds integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); run public.question_runs; collection public.question_sets; result jsonb; existing uuid;
begin
 if caller is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into run from public.question_runs where id=p_run and user_id=caller for update;
 if not found or not(p_question=any(run.question_ids)) then raise exception 'Run/question unavailable' using errcode='42501'; end if;
 select t.request_id into existing from public.question_run_answers a join public.question_attempts t on t.id=a.attempt_id where a.run_id=p_run and a.question_id=p_question;
 if existing is not null and existing<>p_request then raise exception 'Questão já respondida nesta execução. Inicie outra tentativa para refazer.' using errcode='22023'; end if;
 select * into collection from public.question_sets where id=run.set_id and user_id=caller;
 result:=public.answer_question(p_question,p_option,p_request,null,collection.subject_id,collection.topic_id,p_seconds);
 insert into public.question_run_answers(run_id,user_id,question_id,attempt_id) values(p_run,caller,p_question,(result->'attempt'->>'id')::uuid) on conflict(run_id,question_id) do nothing;
 if (select count(*) from public.question_run_answers where run_id=p_run)=cardinality(run.question_ids) then update public.question_runs set completed_at=coalesce(completed_at,now()) where id=p_run; end if;
 return result;
end $$;
revoke all on function public.create_question_set(uuid,uuid,uuid,uuid,text,text,uuid[]),public.start_question_run(uuid,uuid,uuid,boolean),public.answer_question_run(uuid,uuid,uuid,uuid,integer) from public,anon;
grant execute on function public.create_question_set(uuid,uuid,uuid,uuid,text,text,uuid[]),public.start_question_run(uuid,uuid,uuid,boolean),public.answer_question_run(uuid,uuid,uuid,uuid,integer) to authenticated;
create index question_sets_owner on public.question_sets(user_id,created_at desc);
create index question_runs_owner on public.question_runs(user_id,started_at desc);
create index question_run_answers_owner on public.question_run_answers(user_id,run_id);
notify pgrst,'reload schema';
commit;
