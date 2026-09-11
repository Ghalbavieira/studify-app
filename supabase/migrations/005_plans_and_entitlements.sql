begin;

alter table public.profiles
  add column if not exists plan text not null default 'free' check (plan in ('free','pro')),
  add column if not exists plan_status text not null default 'active' check (plan_status in ('active','trialing','past_due','canceled')),
  add column if not exists plan_started_at timestamptz,
  add column if not exists plan_expires_at timestamptz,
  add column if not exists billing_customer_id text,
  add column if not exists billing_subscription_id text;

create index if not exists profiles_plan_idx on public.profiles(plan, plan_status);

commit;
