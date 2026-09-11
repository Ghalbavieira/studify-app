# Configurar Supabase

## 1. Copiar dois valores

No projeto Supabase:

- **Project URL**: no botão **Connect** ou em **Settings → Data API**. Exemplo: `https://SEU_PROJECT_REF.supabase.co`.
- **Publishable key**: em **Settings → API Keys**, na seção de chaves publicáveis. O valor começa com `sb_publishable_`.

O aplicativo não usa a chave `anon` legada, Secret key nem service role. A proteção dos registros vem de autenticação e RLS, não do sigilo da chave publicável.

## 2. Preencher `.env.local`

Na raiz do projeto, mantenha:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_COLE_SUA_CHAVE
```

O arquivo `.env.example` contém somente placeholders e está liberado no Git. `.env.local` continua ignorado. Não copie a chave `sb_secret_` para nenhuma variável `NEXT_PUBLIC_*`.

Reinicie `npm run dev` depois de alterar o ambiente. Em deploy, configure essas duas variáveis no ambiente de build e publique uma nova versão.

Em **Authentication → URL Configuration**, configure a Site URL do app (local: `http://localhost:3000`) e adicione `http://localhost:3000/cadastro` à lista de Redirect URLs. Em produção, adicione o endereço equivalente do site publicado. O cadastro usa e-mail/senha; se a confirmação de e-mail estiver habilitada, confirme antes de entrar.

## 3. Executar os arquivos SQL

Abra **SQL Editor → New query**, cole o conteúdo completo de cada arquivo e execute, nesta ordem, uma vez:

1. `supabase/migrations/001_initial_schema.sql`: as 16 tabelas, foreign keys compostas que impedem relações entre usuários diferentes, índices, constraints, RLS, criação automática de perfil e correção de questões no servidor.
2. `supabase/migrations/002_study_data_functions.sql`: leitura e gravação transacional dos estudos, com controle de versão para detectar edições em outro dispositivo.
3. `supabase/migrations/003_demo_questions.sql`: seis questões autorais de demonstração. Não é um acervo de provas oficiais. Pode ser omitido se você pretende abastecer o catálogo com outro conteúdo autorizado.

Não crie tabelas pelo Table Editor. Mudanças futuras devem entrar em novas migrations. Os arquivos usam transações; em caso de erro, a migration inteira é revertida. Não repita uma migration já aplicada: nomes de tabelas existentes causarão erro, sem apagar registros.

## 4. Verificar tabelas e RLS

Execute o conteúdo de `supabase/verify.sql` no SQL Editor.

Resultados esperados:

- Primeira consulta: **16 linhas**, todas com `exists = true` e `rls_enabled = true`.
- Políticas: tabelas de estudo usam o usuário autenticado como proprietário; catálogos têm somente leitura; tentativas têm somente leitura do proprietário e gravação via `answer_question`.
- Foreign keys: `convalidated = true`.
- Índices: índices por proprietário, data, matéria, tópico e chaves estrangeiras.
- Consulta de permissões: os quatro valores devem ser **false**.
- Funções: `answer_question`, `get_study_data` e `save_study_data`.

O SQL Editor normalmente opera com privilégios administrativos e pode ignorar RLS. Ver tabelas por ele não prova isolamento de usuários. Para conferir o fluxo real:

1. Cadastre e confirme uma conta A. Crie objetivo, matéria, tópico e um bloco.
2. Em outra janela/perfil de navegador, cadastre uma conta B. Ela não deve ver os dados de A.
3. Responda uma questão com A. A tentativa deve aparecer em `question_attempts` com o `user_id` de A; os acertos são definidos pela função do banco.
4. A conta B não deve ver as tentativas de A.
5. Atualize uma conta em dois dispositivos: uma edição baseada em versão antiga deve pedir atualização, sem sobrescrever silenciosamente o outro dispositivo.

## Tabelas

- Identidade e estudo: `profiles`, `goals`, `subjects`, `topics`, `weekly_plans`, `study_blocks`, `study_sessions`.
- Retenção: `reviews`, `recalls`.
- Decisão: `ai_recommendations`, `plan_adjustments`.
- Questões: `exam_boards`, `exams`, `questions`, `question_options`, `question_attempts`.

O gabarito e a explicação não são selecionáveis pelo frontend antes da resposta. `answer_question` valida a opção, calcula o acerto, registra a tentativa e devolve a correção. Repetir a mesma requisição não duplica a tentativa. Os contadores manuais das sessões representam questões respondidas fora do Studify; eles não repetem as tentativas do banco.

## Explicações opcionais por LLM

O motor de prioridades funciona sem LLM. Para habilitar a camada opcional de texto, configure no servidor:

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=
```

Use um modelo da sua conta que suporte Responses API e Structured Outputs. Nenhuma dessas variáveis usa `NEXT_PUBLIC`. A rota autentica o usuário, busca seus registros via RLS e recalcula o contexto no servidor. O LLM recebe esse contexto apenas para explicar; não calcula acertos, não altera pontuações e não aplica mudanças no plano. Sem configuração ou em caso de falha, a explicação determinística permanece disponível.

## Testes locais de banco

As migrations podem ser testadas em PostgreSQL em memória, sem acesso ao projeto remoto e sem adicionar dependências ao app:

```sh
npm install --prefix /tmp/studify-db-check --no-save --package-lock=false @electric-sql/pglite
node supabase/tests/schema.test.mjs /tmp/studify-db-check/node_modules/@electric-sql/pglite/dist/index.js
```

O teste simula Supabase Auth somente no banco temporário, aplica as migrations e verifica isolamento entre dois usuários, correção no servidor, idempotência e conflitos de versão. Ele não substitui a conferência do projeto Supabase real.

Referências: [API keys](https://supabase.com/docs/guides/getting-started/api-keys), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
