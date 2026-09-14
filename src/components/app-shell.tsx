"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, CalendarDays, FileSearch, Home, ListChecks, LogOut, Menu, Settings, TimerReset, Users, ChartNoAxesCombined, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Brand } from "./brand";
import { useStudyData, refreshStudyData, setStudyError, initializeCloudData } from "@/lib/study-store";
import { getSupabaseClient } from "@/lib/supabase/client";
import { clearSocialCache } from "@/lib/social-store";
import { useActiveStudy, saveActiveStudy, elapsedStudy } from "@/lib/active-study";

const primary = [
  { href: "/dashboard", label: "Início", icon: Home },
  { href: "/estudos", label: "Estudar", icon: TimerReset },
  { href: "/questoes", label: "Questões", icon: ListChecks },
  { href: "/comunidade", label: "Comunidade", icon: Users },
];
const more = [
  { href: "/edital", label: "Edital", icon: FileSearch },
  { href: "/plano", label: "Plano", icon: CalendarDays },
  { href: "/revisoes", label: "Erros & Revisões", icon: RotateCcw },
  { href: "/analises", label: "Desempenho", icon: ChartNoAxesCombined },
  { href: "/materias", label: "Matérias e tópicos", icon: BookOpen },
  { href: "/questoes/listas", label: "Minhas listas e simulados", icon: ListChecks },
  { href: "/painel", label: "Preparação e diário", icon: BookOpen },
  { href: "/ia", label: "Recomendações", icon: ChartNoAxesCombined },
  { href: "/relatorios", label: "Relatórios", icon: FileSearch },
  { href: "/planos", label: "Planos", icon: ListChecks },
  { href: "/perfil", label: "Objetivo e perfil", icon: Users },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
  { href: "/feedback", label: "Enviar feedback", icon: BookOpen },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [offline, setOffline] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const { ready, mode, saving, error, userId, data } = useStudyData();
  const active = useActiveStudy();
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    const frame = requestAnimationFrame(sync);
    window.addEventListener("online", sync); window.addEventListener("offline", sync);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);
  useEffect(() => { if (mode === "signed-out") router.replace("/login"); }, [mode, router]);
  useEffect(() => { if (!active) return; const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, [active]);
  async function signOut() {
    if (active && !window.confirm("Sair e abandonar a contagem em andamento? As sessões já salvas serão preservadas.")) return;
    if (mode === "cloud") {
      const { error } = await getSupabaseClient().auth.signOut();
      if (error) { setStudyError("Não foi possível sair. Tente novamente."); return; }
      saveActiveStudy(userId, null); clearSocialCache(); await initializeCloudData(null);
      window.location.replace("/login");
    } else router.replace("/");
  }
  const navLink = ({ href, label, icon: Icon }: typeof primary[number]) => <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={pathname === href ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm ${pathname === href ? "bg-accent-subtle text-accent" : "text-secondary hover:bg-raised"}`}><Icon size={18} /><span>{label}</span></Link>;
  const seconds = active ? elapsedStudy(active, clock) : 0;
  return <div className="min-h-dvh bg-background text-foreground"><div className="mx-auto flex min-h-dvh max-w-[1600px]">
    <aside className="hidden w-60 shrink-0 border-r border-line bg-background-secondary p-5 lg:block"><div className="sticky top-5"><Brand /><nav className="mt-7 space-y-1" aria-label="Navegação principal">{primary.map(navLink)}</nav><nav className="mt-4 space-y-1 border-t border-line pt-4" aria-label="Mais">{more.map(navLink)}</nav><button onClick={() => void signOut()} className="mt-5 flex min-h-11 items-center gap-3 px-3 text-sm text-muted"><LogOut size={18} />Sair</button></div></aside>
    <main className="min-w-0 flex-1 pb-24 lg:pb-6"><header className="flex h-16 items-center justify-between border-b border-line px-4 lg:hidden"><Brand /><span className="truncate pl-4 text-sm text-muted">{data.profileName.split(" ")[0]}</span></header>
      {open && <nav aria-label="Mais opções" className="grid grid-cols-1 gap-1 border-b border-line bg-surface p-4 sm:grid-cols-2 lg:hidden">{more.map(navLink)}<button onClick={() => void signOut()} className="flex min-h-11 items-center gap-3 px-3 text-sm"><LogOut size={18} />Sair</button></nav>}
      <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        {offline && <p role="status" className="mb-4 border-l-2 border-attention p-3 text-sm text-attention">Você está sem conexão. O timer continua; reconecte para salvar no Studify.</p>}
        {mode === "local" && <p className="mb-4 text-xs text-muted">Modo local · dados somente neste navegador.</p>}
        {saving && <p role="status" className="mb-3 text-sm text-accent">Salvando…</p>}
        {error && <div role="alert" className="mb-5 text-sm text-attention">{error}{mode === "cloud" && <button onClick={() => void refreshStudyData()} className="ml-2 min-h-11 underline">Atualizar dados</button>}</div>}
        {ready ? children : <p role="status" className="py-12 text-muted">{mode === "signed-out" ? "Voltando ao login…" : "Carregando seus estudos…"}</p>}
      </div>
      {ready && active && pathname !== "/estudos" && <div className="sticky bottom-20 mx-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-accent bg-surface p-3 shadow-lg lg:bottom-4"><span className="text-sm">{data.subjects.find(s => s.id === active.subjectId)?.name} · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2,"0")} · {active.runningSince === null ? "pausado" : "em andamento"}</span><Link href="/estudos" className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold">Retomar sessão</Link></div>}
    </main>
    <nav aria-label="Navegação móvel" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-background-secondary px-1 pb-[env(safe-area-inset-bottom)] lg:hidden">{primary.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={pathname === href ? "page" : undefined} className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 text-[10px] sm:text-xs ${pathname === href ? "text-accent" : "text-muted"}`}><Icon size={21} />{label}</Link>)}<button aria-expanded={open} onClick={() => setOpen(!open)} className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs text-muted"><Menu size={21} />Mais</button></nav>
  </div></div>;
}
