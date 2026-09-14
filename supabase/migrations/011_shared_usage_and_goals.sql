begin;
-- Shared by Web and Mobile through the existing Web APIs. Billing fields remain protected.
alter table public.profiles add column if not exists usage_counters jsonb not null default '{}';
create function public.consume_studify_usage(p_feature text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); entitlement jsonb; counters jsonb; period text; used integer; allowed integer;
begin
  if caller is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_feature not in ('ai','exam_import') then raise exception 'Unknown feature' using errcode='22023'; end if;
  select usage_counters into counters from public.profiles where id=caller for update;
  entitlement := public.get_entitlement();
  period := to_char(now() at time zone 'UTC', case when p_feature='ai' then 'YYYY-MM-DD' else 'YYYY-MM' end);
  allowed := (entitlement->'limits'->>case when p_feature='ai' then 'aiRequestsPerDay' else 'examImportsPerMonth' end)::integer;
  used := case when counters->p_feature->>'period'=period then coalesce((counters->p_feature->>'used')::integer,0) else 0 end;
  if used >= allowed then return jsonb_build_object('allowed',false,'limit',allowed,'used',used,'period',period); end if;
  update public.profiles set usage_counters=jsonb_set(counters,array[p_feature],jsonb_build_object('period',period,'used',used+1),true) where id=caller;
  return jsonb_build_object('allowed',true,'limit',allowed,'used',used+1,'period',period);
end $$;
create function public.activate_study_goal(p_id uuid, p_title text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); existing public.goals; entitlement jsonb;
begin
  if caller is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform 1 from public.profiles where id=caller for update;
  if not found then raise exception 'Profile unavailable' using errcode='42501'; end if;
  select * into existing from public.goals where id=p_id;
  if found and existing.user_id<>caller then raise exception 'Goal unavailable' using errcode='42501'; end if;
  if existing.id is null then
    if p_title is null or char_length(btrim(p_title)) not between 1 and 160 then raise exception 'Invalid goal title' using errcode='22023'; end if;
    entitlement:=public.get_entitlement();
    if (select count(*) from public.goals where user_id=caller)>=(entitlement->'limits'->>'goals')::integer then raise exception 'Seu plano atingiu o limite de objetivos.' using errcode='P0001'; end if;
    insert into public.goals(id,user_id,title,is_active) values(p_id,caller,btrim(p_title),false);
  end if;
  update public.goals set is_active=false where user_id=caller and is_active and id<>p_id;
  update public.goals set is_active=true where id=p_id and user_id=caller;
  update public.profiles set data_version=data_version+1 where id=caller;
  return public.get_study_data();
end $$;
revoke all on function public.consume_studify_usage(text),public.activate_study_goal(uuid,text) from public,anon;
grant execute on function public.consume_studify_usage(text),public.activate_study_goal(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
