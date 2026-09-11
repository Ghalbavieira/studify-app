import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  ListChecks,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Brand } from "@/components/brand";

const cycle = [
  {
    icon: Target,
    title: "Planeje com objetivo",
    text: "Transforme prova, prazo e disponibilidade em um plano que cabe na sua rotina.",
  },
  {
    icon: Clock3,
    title: "Estude com foco",
    text: "Abra o próximo bloco, escolha a matéria e registre uma sessão real de estudo.",
  },
  {
    icon: ListChecks,
    title: "Registre evidências",
    text: "Questões, revisões, recalls e acertos entram no histórico sem depender da memória.",
  },
  {
    icon: BrainCircuit,
    title: "Ajuste com inteligência",
    text: "A IA recomenda o próximo passo com base no que você realmente executou e aprendeu.",
  },
];

const reasons = [
  ["Planejado × executado", "Veja se o plano está funcionando de verdade, sem premiar horas vazias."],
  ["Progresso por matéria", "Identifique rapidamente onde você está avançando e onde está ficando para trás."],
  ["Revisões e recalls", "Volte ao conteúdo no momento certo e acompanhe se ele realmente ficou na memória."],
  ["Comunidade de estudos", "Compartilhe rotina, aprendizados e evolução com pessoas que também estão estudando."],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Brand />
          <nav className="flex items-center gap-2">
            <Link href="/planos" className="rounded-md px-3 py-2 text-sm font-medium text-secondary">Planos</Link>
            <Link href="/login" className="rounded-md px-3 py-2 text-sm font-medium text-secondary">
              Entrar
            </Link>
            <Link href="/cadastro" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold">
              Começar agora
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1.02fr_.98fr] lg:py-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-xs font-medium uppercase tracking-[.16em] text-accent">
            <BookOpenCheck size={15} /> Para quem estuda com objetivo
          </div>

          <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-6xl">
            Pare de só estudar.
            <span className="mt-2 block text-accent">Comece a evoluir com clareza.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-secondary sm:text-xl">
            O Studify organiza o que você precisa estudar, registra o que realmente fez e mostra o próximo passo com base no seu desempenho.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/cadastro" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold">
              Criar meu plano <ArrowRight size={18} />
            </Link>
            <Link href="/dashboard" className="rounded-md border border-line bg-surface px-5 py-3 font-medium text-secondary">
              Ver o ambiente de estudos
            </Link>
          </div>

          <div className="mt-8 grid gap-3 text-sm text-secondary sm:grid-cols-3">
            {["Plano adaptável", "Foco e execução", "Recomendação por IA"].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-success" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-surface p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <p className="text-xs uppercase tracking-[.16em] text-muted">Seu dia no Studify</p>
              <h2 className="mt-1 text-xl font-semibold">Próximo passo claro. Sem adivinhação.</h2>
            </div>
            <div className="rounded-md bg-accent-subtle p-2 text-accent">
              <TrendingUp size={20} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-line bg-background-secondary p-4">
              <p className="text-sm text-muted">Execução da semana</p>
              <p className="mt-2 text-3xl font-semibold">78%</p>
              <p className="mt-1 text-xs text-success">+12% em relação à semana anterior</p>
            </div>
            <div className="rounded-md border border-line bg-background-secondary p-4">
              <p className="text-sm text-muted">Acertos em questões</p>
              <p className="mt-2 text-3xl font-semibold">84%</p>
              <p className="mt-1 text-xs text-secondary">42 questões corrigidas</p>
            </div>
          </div>

          <div className="mt-3 rounded-md border border-violet/40 bg-highlight-subtle p-4">
            <div className="flex items-center gap-2 text-highlight">
              <Sparkles size={16} />
              <span className="text-xs font-semibold uppercase tracking-[.14em]">Studify IA</span>
            </div>
            <p className="mt-3 leading-7 text-secondary">
              Sua prioridade agora é Redes: revisão curta de subnetting + 15 questões. O desempenho caiu nas últimas sessões.
            </p>
          </div>

          <div className="mt-3 rounded-md border border-line bg-background-secondary p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted">Próxima sessão</p>
                <p className="mt-1 font-semibold">Redes de Computadores · 45 min</p>
              </div>
              <Link href="/estudos" className="whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-semibold">
                Estudar agora
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-background-secondary">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-16">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[.16em] text-accent">Um ciclo que faz sentido</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Estudar deixa de ser uma sequência solta de tarefas.</h2>
            <p className="mt-4 text-lg leading-8 text-secondary">Tudo parte do seu objetivo e volta para ele: plano, sessão, evidência, ajuste.</p>
          </div>

          <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-2 xl:grid-cols-4">
            {cycle.map(({ icon: Icon, title, text }, index) => (
              <article key={title} className="bg-surface p-5">
                <div className="flex items-center justify-between">
                  <div className="rounded-md bg-accent-subtle p-2 text-accent"><Icon size={20} /></div>
                  <span className="font-mono text-xs text-muted">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-secondary">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <p className="text-xs font-medium uppercase tracking-[.16em] text-accent">Feito para voltar todos os dias</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Um lugar para estudar, acompanhar e continuar.</h2>
            <p className="mt-4 max-w-xl text-lg leading-8 text-secondary">
              Em vez de abrir cinco ferramentas diferentes, você acompanha sua rotina em um só ambiente e entende o que realmente está mudando.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/cadastro" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold">
                Quero estudar aqui <ArrowRight size={18} />
              </Link>
              <Link href="/comunidade" className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-5 py-3 font-medium text-secondary">
                <Users size={18} /> Conhecer a comunidade
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {reasons.map(([title, text], index) => {
              const icons = [TrendingUp, Target, ShieldCheck, MessageSquareText];
              const Icon = icons[index];
              return (
                <article key={title} className="rounded-md border border-line bg-surface p-5">
                  <Icon size={20} className={index === 3 ? "text-highlight" : "text-accent"} />
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-secondary">{text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-accent">Seu estudo pode ter direção.</p>
            <h2 className="mt-1 text-2xl font-semibold">Comece com um objetivo. O Studify organiza o resto com você.</h2>
          </div>
          <Link href="/cadastro" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold">
            Criar conta grátis <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-sm text-muted sm:px-8">
        <p>Studify · planejamento, execução e evolução no mesmo lugar.</p>
        <div className="flex gap-5">
          <Link href="/login">Entrar</Link>
          <Link href="/planos">Planos</Link>
          <Link href="/comunidade">Comunidade</Link>
          <Link href="/questoes">Questões</Link>
        </div>
      </footer>
    </main>
  );
}
