# Studify

Ferramenta de estudo centrada em Hoje: objetivo, sequência diária, sessões, questões, revisões e prioridades baseadas em evidências.

## Executar

```sh
npm install
npm run dev
```

Abra `http://localhost:3000`. Sem configuração Supabase, o aplicativo identifica explicitamente o modo local e salva neste navegador. Sem dados, as telas começam vazias e orientam a criação do objetivo; não há métricas fictícias.

Para login e sincronização, siga [Configurar Supabase](docs/supabase-setup.md). Use apenas `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no frontend. Crie o banco executando as migrations, não pelo Table Editor.

## Fluxo de uso

1. Criar objetivo/prova, data e meta semanal.
2. Adicionar matérias com pesos e seus tópicos.
3. Montar a semana inteira no Plano, com duração, tipo de sessão e questões previstas.
4. Em Hoje, começar pela próxima ação ou escolher um bloco.
5. Finalizar o cronômetro e registrar tempo efetivo, questões externas e notas.
6. Resolver questões do banco: cada tentativa vira evidência de aprendizagem.
7. Retomar revisões e recalls quando estiverem pendentes; consultar a execução e as prioridades calculadas.

## Verificar

```sh
npm run lint
npm run typecheck
npm run test
npm run build
```

Em ambientes que bloqueiam a porta interna de compilação do Turbopack, a alternativa é `npm run build -- --webpack`, sem alterar o bundler do projeto.

[Configuração e testes de banco](docs/supabase-setup.md) · [Plano de implementação](docs/implementation-plan.md)

## Limites desta versão

- As seis questões iniciais são autorais de demonstração; não são uma base de provas comerciais/oficiais.
- O banco remoto só passa a operar após preencher o ambiente e aplicar as migrations no Supabase.
- A explicação por LLM é opcional e exige configuração de servidor. O motor determinístico é sempre a fonte dos cálculos.
- O cronômetro em andamento é preservado no navegador/dispositivo; sessões finalizadas são sincronizadas quando conectado.
- O catálogo carrega até 200 questões nesta primeira versão. Paginação e ferramentas de autoria/importação são próximas evoluções.

## Comunidade

A camada social inclui grupos, publicações, comentários, curtidas, reposts, favoritos, seguidores e perfil. Com Supabase configurado e as migrations `006_social_mvp.sql` e `007_beta_readiness.sql` aplicadas, os dados sociais são compartilhados entre contas reais com RLS e imagens da comunidade usam Supabase Storage. Sem Supabase, o app mantém o modo local de demonstração. Veja [estrutura e limites](docs/community.md).


## Beta público

Antes de convidar testadores, siga [o checklist de liberação](docs/beta-release.md). O beta inclui recuperação de senha, feedback in-app e importação de edital tolerante a falha parcial. Cobrança real permanece desativada.
