-- Run after the migrations. These queries do not change data.
with expected(name) as (values
  ('profiles'),('goals'),('subjects'),('topics'),('weekly_plans'),('study_blocks'),
  ('study_sessions'),('reviews'),('recalls'),('ai_recommendations'),('plan_adjustments'),
  ('exam_boards'),('exams'),('questions'),('question_options'),('question_attempts')
)
select expected.name as table_name,
       c.oid is not null as exists,
       coalesce(c.relrowsecurity, false) as rls_enabled,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = expected.name) as policy_count
from expected
left join pg_namespace n on n.nspname = 'public'
left join pg_class c on c.relnamespace = n.oid and c.relname = expected.name and c.relkind = 'r'
order by expected.name;

select tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public' order by tablename, policyname;

select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition, convalidated
from pg_constraint
where connamespace = 'public'::regnamespace and contype = 'f'
order by conrelid::regclass::text, conname;

select schemaname, tablename, indexname, indexdef from pg_indexes
where schemaname = 'public' order by tablename, indexname;

select
  has_column_privilege('authenticated', 'public.question_options', 'is_correct', 'SELECT') as can_read_answer_key_should_be_false,
  has_column_privilege('authenticated', 'public.questions', 'explanation', 'SELECT') as can_read_explanation_early_should_be_false,
  has_table_privilege('authenticated', 'public.question_attempts', 'INSERT') as can_forge_attempt_should_be_false,
  has_table_privilege('anon', 'public.study_sessions', 'SELECT') as anonymous_can_read_sessions_should_be_false;

select routine_name from information_schema.routines
where routine_schema = 'public' and routine_name in ('get_study_data','save_study_data','answer_question')
order by routine_name;
