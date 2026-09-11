"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  ChartNoAxesCombined,
  CalendarDays,
  ChevronDown,
  Home,
  LayoutDashboard,
  FileSearch,
  ListChecks,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  TimerReset,
  X,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Brand } from "./brand";
import { useStudyData, refreshStudyData, setStudyError } from "@/lib/study-store";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useSocial } from "@/lib/social-store";
import { useActiveStudy } from "@/lib/active-study";
import { UserAvatar } from "./social/user-avatar";

const items = [
  { href: "/dashboard", label: "Hoje", icon: Home },
  { href: "/painel", label: "Painel", icon: LayoutDashboard },
  { href: "/edital", label: "Edital", icon: FileSearch },
  { href: "/estudos", label: "Estudar", icon: TimerReset },
  { href: "/questoes", label: "Questões", icon: ListChecks },
  { href: "/plano", label: "Plano", icon: CalendarDays },
  { href: "/materias", label: "Matérias", icon: BookOpen },
  { href: "/analises", label: "Análises", icon: BarChart3 },
  { href: "/comunidade", label: "Comunidade", icon: Users },
  { href: "/ia", label: "IA", icon: ChartNoAxesCombined },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { ready, mode, saving, error } = useStudyData();
  const { me } = useSocial();
  const activeStudy = useActiveStudy();

  useEffect(() => {
    const saved = localStorage.getItem("studify.sidebar.collapsed") === "1";
    const frame = requestAnimationFrame(() => setCollapsed(saved));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function closeProfile(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", closeProfile);
    return () => document.removeEventListener("mousedown", closeProfile);
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem("studify.sidebar.collapsed", next ? "1" : "0");
      return next;
    });
  }

  async function signOut() {
    if (mode === "cloud") {
      const { error: signOutError } = await getSupabaseClient().auth.signOut();
      if (signOutError) setStudyError("Não foi possível sair. Tente novamente.");
      return;
    }
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className={`relative hidden shrink-0 border-r border-line bg-background-secondary py-6 transition-[width] duration-200 lg:flex lg:flex-col ${collapsed ? "w-[76px] px-3" : "w-60 px-5"}`}>
          <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
            <Brand compact={collapsed} />
          </div>

          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            className="absolute -right-3 top-7 flex h-7 w-7 items-center justify-center rounded-md border border-line bg-background-secondary text-muted hover:text-foreground"
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>

          <nav className="mt-8 space-y-1" aria-label="Navegação principal">
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                activeStudy && href !== "/estudos" ? (
                  <span
                    key={href}
                    title="Finalize ou reinicie a sessão para liberar a navegação"
                    aria-disabled="true"
                    className={`flex cursor-not-allowed items-center rounded-md py-3 text-sm font-semibold text-muted opacity-45 ${collapsed ? "justify-center px-2" : "gap-3 px-4"}`}
                  >
                    <Icon size={19} className="shrink-0" />
                    {!collapsed && <span>{label}</span>}
                  </span>
                ) : (
                  <Link
                    key={href}
                    href={href}
                    title={collapsed ? label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center rounded-md py-3 text-sm font-semibold transition ${collapsed ? "justify-center px-2" : "gap-3 px-4"} ${active ? "bg-accent-subtle text-accent" : "text-secondary hover:bg-raised hover:text-foreground"}`}
                  >
                    <Icon size={19} className="shrink-0" />
                    {!collapsed && <span>{label}</span>}
                  </Link>
                )
              );
            })}
          </nav>

          <div ref={profileRef} className="relative mt-auto border-t border-line pt-4">
            {profileOpen && (
              <div className={`absolute bottom-[68px] z-30 border border-line bg-surface p-1 shadow-xl ${collapsed ? "left-0 w-52" : "left-0 right-0"}`} style={{ borderRadius: 8 }}>
                <Link href={`/comunidade/${me.username}`} onClick={() => setProfileOpen(false)} className="block rounded-md px-3 py-2 text-sm text-secondary hover:bg-raised hover:text-foreground">Meu perfil</Link>
                <Link href="/configuracoes" onClick={() => setProfileOpen(false)} className="block rounded-md px-3 py-2 text-sm text-secondary hover:bg-raised hover:text-foreground">Configurações</Link>
                <button onClick={() => void signOut()} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-secondary hover:bg-raised hover:text-foreground"><LogOut size={16} /> Sair</button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setProfileOpen((current) => !current)}
              title={collapsed ? `${me.name} · @${me.username}` : undefined}
              aria-expanded={profileOpen}
              className={`flex w-full items-center rounded-md text-left hover:bg-raised ${collapsed ? "justify-center p-2" : "gap-3 p-2"}`}
            >
              <UserAvatar profile={me} size="sm" />
              {!collapsed && <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{me.name}</span>
                  <span className="block truncate text-xs text-muted">@{me.username}</span>
                </span>
                <ChevronDown size={16} className="text-muted" />
              </>}
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-background-secondary px-4 backdrop-blur lg:hidden">
            <Brand compact />
            <button aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)} className="rounded-md border border-line p-2 text-foreground">
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </header>

          {open && (
            <div className="border-b border-line bg-surface p-4 lg:hidden">
              <nav id="mobile-navigation" aria-label="Navegação principal" className="grid grid-cols-2 gap-2">
                {items.map(({ href, label, icon: Icon }) => activeStudy && href !== "/estudos" ? (
                  <span key={href} aria-disabled="true" className="flex cursor-not-allowed items-center gap-2 rounded-md bg-raised px-3 py-3 text-sm text-muted opacity-45">
                    <Icon size={17} /> {label}
                  </span>
                ) : (
                  <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md bg-raised px-3 py-3 text-sm text-foreground">
                    <Icon size={17} /> {label}
                  </Link>
                ))}
              </nav>
              <div className="mt-4 border-t border-line pt-4">
                <Link href={`/comunidade/${me.username}`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-raised">
                  <UserAvatar profile={me} size="sm" />
                  <span><span className="block text-sm font-semibold">{me.name}</span><span className="block text-xs text-muted">@{me.username}</span></span>
                </Link>
                <div className="mt-2 flex gap-2">
                  <Link href="/configuracoes" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-secondary"><Settings size={17} />Configurações</Link>
                  <button onClick={() => void signOut()} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-secondary"><LogOut size={17} />Sair</button>
                </div>
              </div>
            </div>
          )}

          <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
            {activeStudy && <div className="mb-5 border-l-2 border-accent bg-accent-subtle px-3 py-2 text-sm text-secondary"><span className="font-semibold text-accent">Sessão em andamento.</span> A navegação fica bloqueada até você finalizar ou reiniciar o cronômetro.</div>}
            {mode === "local" && <p className="mb-5 border-b border-line pb-3 text-xs text-muted">Modo local · dados neste navegador. {!activeStudy && <Link href="/configuracoes" className="text-accent">Dados e configuração</Link>}</p>}
            {saving && <p role="status" className="mb-3 text-xs text-accent">Salvando…</p>}
            {error && <div role="alert" className="mb-5 border-l-2 border-attention pl-3 text-sm text-attention">{error}{mode === "cloud" && <button onClick={() => void refreshStudyData()} className="ml-2 underline">Atualizar dados</button>}</div>}
            {ready ? children : mode === "signed-out" ? <div className="py-12"><h1 className="text-2xl font-semibold">Entre para continuar seu estudo.</h1><Link href="/login" className="mt-4 inline-block rounded-md bg-primary px-4 py-2">Entrar na conta</Link></div> : !error && <p role="status" className="py-12 text-muted">Carregando seus estudos…</p>}
          </div>
        </main>
      </div>
    </div>
  );
}
