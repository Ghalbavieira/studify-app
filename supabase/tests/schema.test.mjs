import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { PGlite } = await import(process.argv[2] ?? "@electric-sql/pglite");

const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth;
create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;`);
for (const file of ["001_initial_schema.sql", "002_study_data_functions.sql", "003_demo_questions.sql"]) {
  await db.exec(await readFile(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
  console.log(`Migration OK: ${file}`);
}
const userA = "aaaaaaaa-0000-4000-8000-000000000001";
const userB = "bbbbbbbb-0000-4000-8000-000000000001";
await db.query("insert into auth.users(id) values ($1), ($2)", [userA, userB]);
const login = async (user) => {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  await db.exec("set role authenticated");
};
const uuid = (n) => `50000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const data = {
  version: 1, profileName: "Teste A", goal: { id: uuid(1), title: "Prova", examDate: "2026-12-20", weeklyMinutes: 600 },
  subjects: [{ id: uuid(2), name: "Redes", weight: 2, color: "blue" }],
  topics: [{ id: uuid(3), subjectId: uuid(2), title: "IPv4", completed: false }],
  blocks: [{ id: uuid(4), date: "2026-09-13", subjectId: uuid(2), topicId: uuid(3), minutes: 20, description: "Revisar", done: false, plannedQuestions: 10, sessionType: "study" }],
  sessions: [], tasks: [], attempts: [],
};
await login(userA);
const saved = await db.query("select public.save_study_data(0, $1::jsonb) as result", [JSON.stringify(data)]);
assert.equal(saved.rows[0].result.data.subjects[0].name, "Redes");
assert.equal(saved.rows[0].result.revision, 1);
await assert.rejects(() => db.query("select public.save_study_data(0,$1::jsonb)", [JSON.stringify(data)]), /STUDIFY_CONFLICT/);
console.log("Atomic persistence + revision conflict: OK");
await login(userB);
assert.equal((await db.query("select * from public.subjects")).rows.length, 0);
await assert.rejects(() => db.query("insert into public.subjects(user_id,goal_id,name) values ($1,$2,'Intrusão')", [userB, uuid(1)]), /foreign key/);
await assert.rejects(() => db.query("insert into public.goals(user_id,title) values ($1,'Intrusão')", [userA]), /row-level security/);
assert.equal((await db.query("update public.goals set title='Invadido' where id=$1 returning id", [uuid(1)])).rows.length, 0);
assert.equal((await db.query("delete from public.goals where id=$1 returning id", [uuid(1)])).rows.length, 0);
console.log("Cross-user read/write/delete + relationship isolation: OK");
await assert.rejects(() => db.query("select is_correct from public.question_options"), /permission denied/);
await assert.rejects(() => db.query("select explanation from public.questions"), /permission denied/);
await assert.rejects(() => db.query("insert into public.question_attempts(user_id,question_id,is_correct,request_id) values ($1,$2,true,$3)", [userB,"10000000-0000-4000-8000-000000000001",uuid(5)]), /permission denied/);
console.log("Answer keys hidden and forged attempts denied: OK");
await login(userA);
const args = ["10000000-0000-4000-8000-000000000001","20000000-0000-4000-8000-000000000011",uuid(6),uuid(2),uuid(3)];
const answer = await db.query("select public.answer_question($1,$2,$3,null,$4,$5,12) as result", args);
assert.equal(answer.rows[0].result.attempt.is_correct, true);
assert.ok(answer.rows[0].result.explanation.includes("254"));
await db.query("select public.answer_question($1,$2,$3,null,$4,$5,12)", args);
assert.equal((await db.query("select count(*)::int as count from public.question_attempts")).rows[0].count, 1);
await assert.rejects(() => db.query("select public.answer_question($1,$2,$3,null,$4,$5,12)", [args[0],"20000000-0000-4000-8000-000000000021",uuid(7),uuid(2),uuid(3)]), /Option does not belong/);
await login(userB);
assert.equal((await db.query("select * from public.question_attempts")).rows.length, 0);
console.log("Server grading + idempotency + attempt privacy: OK");
await db.exec("reset role");
const rls = await db.query("select relname,relrowsecurity from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='public' and relkind='r'");
assert.equal(rls.rows.length, 16);
assert.ok(rls.rows.every((table) => table.relrowsecurity));
await db.exec("set role anon");
await assert.rejects(() => db.query("select * from public.goals"), /permission denied/);
await assert.rejects(() => db.query("select public.get_study_data()"), /permission denied/);
console.log("All 16 tables have RLS; anonymous data access denied: OK");
await db.close();
