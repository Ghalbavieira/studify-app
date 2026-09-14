# Auditoria antes da implementação — 14/09/2026

Comparação de código com `../studify-mobile`, sem alterar o Mobile ou o banco remoto.

## Inventário de rotas

- `analises/page.tsx`
- `cadastro/page.tsx`
- `comunidade/[id]/page.tsx`
- `comunidade/grupos/[slug]/page.tsx`
- `comunidade/grupos/page.tsx`
- `comunidade/page.tsx`
- `comunidade/publicacao/[postId]/page.tsx`
- `configuracoes/page.tsx`
- `dashboard/page.tsx`
- `edital/page.tsx`
- `estudos/page.tsx`
- `feedback/page.tsx`
- `ia/page.tsx`
- `login/page.tsx`
- `materias/page.tsx`
- `page.tsx`
- `painel/page.tsx`
- `perfil/page.tsx`
- `plano/page.tsx`
- `planos/page.tsx`
- `questoes/page.tsx`
- `recuperar-senha/page.tsx`
- `redefinir-senha/page.tsx`
- `relatorios/page.tsx`

## Resultado por área

- Início: prioridade real via study-core, plano diário e pendências; falta saudação, objetivo/prazo em destaque, semana e caminho de refazer.
- Estudar: timer persistido por usuário, pausa/finalização e registro idempotente. Guard força /estudos e impede navegar. Reiniciar/alterar duração descarta tentativa sem confirmação.
- Questões: catálogo limitado a 200, filtros matéria/tópico/banca/ano, correção por RPC. Falta buscar texto, estados, favoritas, coleções/simulados e retomar execução persistida. Mobile já possui migration 010 e RPCs correspondentes.
- Erros/revisões: tasks existentes em Home; falta central e recuperação. Mobile 0.2 exporta errorRecovery; reutilizar a definição (questões distintas, último retry correto / refazidas).
- Plano: criar/editar/mover/reordenar/concluir/remover, undo e equilibrar semana existentes; concluídos não geram tempo artificial. Falta refazer visível e comparação executada.
- Desempenho: analises, painel e relatorios já agregam sessões + tentativas sem duplicar; falta ações por diagnóstico, recuperação e filtros. Preservar diário de painel e exportação.
- Edital: extração autenticada, confirmação e união não destrutiva de matérias/tópicos; formulário inicializa antes de dados carregarem e chave baseada no nome perde foco. Há função compartilhada de importação no Mobile 0.2.
- Auth: signup/login/reset existentes. Logout depende apenas do listener; stores sociais mantêm cache em memória. Guard do timer interfere com telas públicas.
- Comunidade atual: social-feed e nove tabelas social_*; seguir, curtir, comentar, repostar, salvar, imagens, evidência, perfis e grupos. schema de mídia rejeita HTTPS apesar do upload retornar URL HTTPS. Falhas de persistência são silenciosas; base local contém demonstração. community-store/community-ui/group-page são implementação legada, não usar como backend.
- Entitlement: hook alterado antes desta tarefa usa get_entitlement; migrations Web só chegam em 007. Mobile 009 cria trial de 15 dias no servidor, capabilities e protege cobrança. Não criar novo plano nem conceder Pro no cliente. Quotas de IA/importação não estão implementadas no servidor auditado.
- Planos: página pública só comparação e preço; texto beta promete teste sem exibir estado real.
- PWA: manifest e ícones instaláveis ausentes. Paleta já corresponde à especificação, sem gradientes encontrados no src.
- Responsividade: sidebar desktop e menu mobile existentes, sem tabs inferiores; tabelas usam rolagem; falta navegação principal com cinco conceitos.

## Providers, RPCs e tabelas

StudyProvider → study-store: get_study_data/save_study_data com revision e geração para evitar respostas de usuário anterior. Contrato reexportado de @studify/study-core 0.1.0; Mobile usa 0.2.0. Não truncar documento de salvamento para aplicar histórico Free: a RPC remove registros ausentes.

Tabelas estudo: profiles, goals, subjects, topics, weekly_plans, study_blocks, study_sessions, reviews, recalls, ai_recommendations, plan_adjustments, daily_logs. Questões: exam_boards, exams, questions, question_options, question_attempts; answer_question protege gabarito e idempotência. Social: social_profiles, social_groups, social_group_members, social_posts, social_comments, social_follows, social_likes, social_reposts, social_bookmarks; storage social-media; beta_feedback.

Mobile 008 adiciona política, aceite, bloqueios, denúncias e moderação, com RLS. A integração Web preparada deve acompanhar essa migration. Mobile 009 reutiliza profiles/get_entitlement e limite de objetivos. Mobile 010 reutiliza catálogo e tentativas com question_sets, question_runs, question_run_answers, question_favorites e create_question_set/start_question_run/answer_question_run. Copiar migrations exatas para controle coordenado, nunca reaplicar se já implantadas.

APIs Web: /api/exam-import (PDF/Groq, autenticação, revisão antes de salvar); /api/study-explanation (contexto real, fallback determinístico, sem aplicar ajustes automaticamente).

## Evidências e limites

Baseline: typecheck e lint aprovados; 10 testes Node aprovados. Testes estáticos não validam autenticação/RLS remota. Não foi feita alteração de banco nem envio social. Comparação comunitária precisa agregação anônima com amostra mínima; não calcular a partir de posts ou acessar estudos privados alheios.

Alterações pré-existentes preservadas: package.json/package-lock.json, study-data.ts, priority-engine.ts, use-plan.ts, vendor/.
