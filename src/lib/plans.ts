export type StudifyPlan = "free" | "pro";

export type PlanLimits = {
  activeGoals: number;
  editalImportsPerMonth: number;
  aiRecommendationsPerDay: number;
  studyHistoryDays: number | null;
  groupsOwned: number;
};

export const STUDIFY_PLANS: Record<StudifyPlan, {
  name: string;
  priceMonthly: number;
  description: string;
  limits: PlanLimits;
  features: string[];
}> = {
  free: {
    name: "Grátis",
    priceMonthly: 0,
    description: "Para começar a organizar e executar os estudos.",
    limits: {
      activeGoals: 1,
      editalImportsPerMonth: 1,
      aiRecommendationsPerDay: 3,
      studyHistoryDays: 30,
      groupsOwned: 1,
    },
    features: [
      "1 objetivo ativo",
      "Cronômetro e sessões de estudo",
      "Matérias, tópicos e plano semanal",
      "Painel básico de evolução",
      "Comunidade e grupos",
      "1 importação de edital por mês",
      "Até 3 recomendações de IA por dia",
      "Histórico dos últimos 30 dias",
    ],
  },
  pro: {
    name: "Pro",
    priceMonthly: 14.9,
    description: "Para quem quer acompanhamento completo até a prova.",
    limits: {
      activeGoals: 10,
      editalImportsPerMonth: 10,
      aiRecommendationsPerDay: 50,
      studyHistoryDays: null,
      groupsOwned: 10,
    },
    features: [
      "Até 10 objetivos ativos",
      "Importação de edital com IA",
      "Painel completo de preparação",
      "Histórico completo",
      "Análises avançadas por matéria e tópico",
      "Até 50 recomendações de IA por dia",
      "Mais grupos de estudo",
      "Relatórios e exportações avançadas",
    ],
  },
};

export function formatPlanPrice(value: number) {
  if (value === 0) return "Grátis";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
