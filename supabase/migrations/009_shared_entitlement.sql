begin;

-- Reuses profiles from Web migration 005. No second subscription table.
-- Billing providers must update these fields only through a trusted server.
revoke insert, update on public.profiles from authenticated;
grant insert (id, display_name, timezone, data_version) on public.profiles to authenticated;
grant update (display_name, timezone, data_version) on public.profiles to authenticated;

create or replace function public.create_user_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name, plan, plan_status, plan_started_at, plan_expires_at)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 100),
    'pro', 'trialing', now(), now() + interval '15 days');
  return new;
end;
$$;
revoke all on function public.create_user_profile() from public, anon, authenticated;

create or replace function public.get_entitlement() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  profile public.profiles%rowtype;
  is_trial boolean;
  has_pro boolean;
begin
  if caller is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into profile from public.profiles where id = caller;
  if not found then raise exception 'Profile unavailable' using errcode = '42501'; end if;
  is_trial := profile.plan = 'pro' and profile.plan_status = 'trialing'
    and profile.plan_started_at <= now() and profile.plan_expires_at > now();
  has_pro := coalesce(is_trial, false) or (
    profile.plan = 'pro' and profile.plan_status in ('active', 'canceled')
    and (profile.plan_started_at is null or profile.plan_started_at <= now())
    and (profile.plan_expires_at > now() or (profile.plan_expires_at is null and profile.plan_status = 'active'))
  );
  has_pro := coalesce(has_pro, false);
  is_trial := coalesce(is_trial, false);
  return jsonb_build_object(
    'version', 1, 'plan', case when has_pro then 'pro' else 'free' end,
    'status', case when is_trial then 'trialing' when has_pro then 'active' else 'free' end,
    'billingStatus', profile.plan_status,
    'expiresAt', profile.plan_expires_at,
    'trialDaysRemaining', case when is_trial then ceil(extract(epoch from profile.plan_expires_at - now()) / 86400)::integer else 0 end,
    'serverTime', now(),
    'capabilities', jsonb_build_object(
      'canCreateMultipleGoals', has_pro, 'canUseFullHistory', has_pro,
      'canUseAdvancedAnalytics', has_pro, 'canUseAdvancedAI', has_pro,
      'canUseAdvancedExamImport', has_pro, 'canUseAdvancedPlanning', has_pro,
      'canUseFullReports', has_pro, 'canUseTimer', true, 'canUseCommunity', true
    ),
    'limits', jsonb_build_object('goals', case when has_pro then 10 else 1 end,
      'historyDays', case when has_pro then null else 30 end,
      'examImportsPerMonth', case when has_pro then 10 else 1 end,
      'aiRequestsPerDay', case when has_pro then 50 else 3 end)
  );
end;
$$;
revoke all on function public.get_entitlement() from public, anon;
grant execute on function public.get_entitlement() to authenticated;

-- Serializes new goal creation, including direct table writes, for both clients.
create function public.enforce_goal_entitlement() returns trigger
language plpgsql security definer set search_path = '' as $$
declare allowed integer;
begin
  if auth.uid() is null then return new; end if;
  if new.user_id <> auth.uid() then raise exception 'Goal owner mismatch' using errcode = '42501'; end if;
  perform 1 from public.profiles where id = auth.uid() for update;
  -- save_study_data uses INSERT ON CONFLICT for the current goal.
  if exists(select 1 from public.goals where id = new.id and user_id = auth.uid()) then return new; end if;
  allowed := (public.get_entitlement() -> 'limits' ->> 'goals')::integer;
  if (select count(*) from public.goals where user_id = auth.uid()) >= allowed then
    raise exception 'Seu plano atingiu o limite de objetivos. Edite um objetivo existente.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_goal_entitlement() from public, anon, authenticated;
create trigger enforce_goal_entitlement before insert on public.goals for each row execute function public.enforce_goal_entitlement();

notify pgrst, 'reload schema';
commit;
