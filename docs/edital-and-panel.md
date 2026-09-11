# Edital + Painel de preparação

## Banco

Depois das migrations 001, 002 e 003, execute também:

`supabase/migrations/004_exam_context_and_daily_logs.sql`

Ela adiciona metadados do objetivo (banca, órgão, cargo/perfil, total de questões e corte), quantidade de questões por matéria e o fechamento diário.

## Extração automática do PDF

A rota `/edital` funciona manualmente mesmo sem IA. Para extrair o PDF automaticamente no servidor, configure também:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

O PDF é enviado para a análise com `store: false`. A resposta é apresentada para revisão e só altera matérias/tópicos quando a pessoa confirma.

## Rotas

- `/edital`: upload, extração e revisão do conteúdo programático.
- `/painel`: cobertura do edital, execução semanal, questões, prioridades, matérias de risco e fechamento diário.
