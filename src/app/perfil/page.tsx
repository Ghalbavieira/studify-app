"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { timeLabel } from "@/components/study-ui";
import { useStudyData } from "@/lib/study-store";
import { useCommunity } from "@/lib/community-store";
import { calculateMetrics } from "@/lib/priority-engine";

export default function ProfilePage() {
  const { data } = useStudyData();
  const community = useCommunity();
  const metrics = calculateMetrics(data);
  const groups = community.data.groups.filter((group) => community.data.members.some((member) => member.groupId === group.id && member.userId === community.userId));
  return <AppShell><div className="mx-auto max-w-4xl"><header><p className="text-sm text-accent">Seu percurso de estudo</p><h1 className="mt-2 text-3xl font-semibold">{data.profileName || "Seu perfil"}</h1><p className="mt-3 text-secondary">{data.goal?.title || "Defina seu objetivo para começar."}</p><Link href="/configuracoes" className="mt-3 inline-block text-sm text-accent">Editar nome e objetivo</Link></header>
    <dl className="my-8 flex flex-wrap gap-x-12 gap-y-5 border-y border-line py-6"><div><dt className="text-sm text-muted">Tempo estudado · total</dt><dd className="mt-2 text-2xl">{timeLabel(data.sessions.reduce((sum, session) => sum + session.seconds, 0))}</dd></div><div><dt className="text-sm text-muted">Execução do tempo · semana</dt><dd className="mt-2 text-2xl">{metrics.plannedSeconds ? `${Math.round(metrics.executedSeconds / metrics.plannedSeconds * 100)}%` : "Sem plano"}</dd></div></dl>
    <section><h2 className="text-xl font-semibold">Matérias</h2><ul className="mt-3 divide-y divide-line">{data.subjects.map((subject) => <li key={subject.id} className="py-3 text-secondary">{subject.name}</li>)}</ul>{!data.subjects.length && <p className="mt-3 text-sm text-muted">Nenhuma matéria cadastrada.</p>}</section>
    <section className="mt-8"><h2 className="text-xl font-semibold">Grupos</h2><p className="mt-2 text-xs text-muted">Participações locais na demonstração da Comunidade.</p><ul className="mt-3 divide-y divide-line">{groups.map((group) => <li key={group.id} className="py-3"><Link className="text-accent" href={`/comunidade/${group.id}`}>{group.name}</Link></li>)}</ul>{!groups.length && <Link className="mt-3 inline-block text-sm text-accent" href="/comunidade">Explorar grupos</Link>}</section>
    <section className="mt-8"><h2 className="text-xl font-semibold">Progresso recente</h2><ul className="mt-3 divide-y divide-line">{[...data.sessions].sort((a, b) => b.endedAt.localeCompare(a.endedAt)).slice(0, 7).map((session) => <li key={session.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{data.subjects.find((subject) => subject.id === session.subjectId)?.name ?? "Estudo"}</span><span className="text-muted">{timeLabel(session.seconds)} · {new Date(session.endedAt).toLocaleDateString("pt-BR")}</span></li>)}</ul>{!data.sessions.length && <p className="mt-3 text-sm text-muted">Suas sessões concluídas aparecerão aqui.</p>}</section>
  </div></AppShell>;
}
