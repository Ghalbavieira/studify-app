"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  ChartNoAxesCombined,
  CalendarDays,
  Home,
  ListChecks,
  LogOut,
  Menu,
  Settings,
  TimerReset,
  X,
  Users,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { Brand } from "./brand";
import { useStudyData, refreshStudyData, setStudyError } from "@/lib/study-store";
import { getSupabaseClient } from "@/lib/supabase/client";

const items = [
  { href: "/dashboard", label: "Hoje", icon: Home },
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
  const { ready, mode, saving, error } = useStudyData();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-60 shrink-0 border-r border-line bg-background-secondary px-5 py-6 lg:flex lg:flex-col">
          <Brand />
          <nav className="mt-8 space-y-1">
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={pathname === href ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-accent-subtle text-accent"
                      : "text-secondary hover:bg-raised hover:text-foreground"
                  }`}
                >
                  <Icon size={19} />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto space-y-2 border-t border-line pt-5">
            <Link href="/perfil" className="flex items-center gap-3 rounded-md px-4 py-3 text-sm text-secondary hover:bg-raised"><UserRound size={19} /> Perfil</Link>
            <Link href="/configuracoes" className="flex w-full items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold text-secondary hover:bg-raised hover:text-foreground">
              <Settings size={19} /> Configurações
            </Link>
            <button onClick={async () => {
              if (mode === "cloud") { const { error } = await getSupabaseClient().auth.signOut(); if (error) setStudyError("Não foi possível sair. Tente novamente."); }
              else router.push("/");
            }} className="flex w-full items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold text-secondary hover:bg-raised hover:text-foreground"><LogOut size={19} /> Sair</button>
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
                {items.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                  aria-current={pathname === href ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-md bg-raised px-3 py-3 text-sm text-foreground"
                  >
                    <Icon size={17} /> {label}
                  </Link>
                ))}
                <Link href="/perfil" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-3 text-sm text-secondary"><UserRound size={17} />Perfil</Link>
                <Link href="/configuracoes" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-3 text-sm text-secondary"><Settings size={17} />Configurações</Link>
              </nav>
            </div>
          )}

          <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
            {mode === "local" && <p className="mb-5 border-b border-line pb-3 text-xs text-muted">Modo local · dados neste navegador. <Link href="/configuracoes" className="text-accent">Dados e configuração</Link></p>}
            {saving && <p role="status" className="mb-3 text-xs text-accent">Salvando…</p>}
            {error && <div role="alert" className="mb-5 border-l-2 border-attention pl-3 text-sm text-attention">{error}{mode === "cloud" && <button onClick={() => void refreshStudyData()} className="ml-2 underline">Atualizar dados</button>}</div>}
            {ready ? children : mode === "signed-out" ? <div className="py-12"><h1 className="text-2xl font-semibold">Entre para continuar seu estudo.</h1><Link href="/login" className="mt-4 inline-block rounded-md bg-primary px-4 py-2">Entrar na conta</Link></div> : !error && <p role="status" className="py-12 text-muted">Carregando seus estudos…</p>}
          </div>
        </main>
      </div>
    </div>
  );
}
