# Studify — beta para testadores

Esta entrega prioriza uso real até a prova, não expansão de escopo.

## Fechado nesta versão

- Auth Supabase existente mantido e recuperação/redefinição de senha adicionadas.
- Persistência principal de objetivo, matérias, tópicos, plano, sessões, questões e tarefas no Supabase.
- Fechamento diário salvo em `daily_logs` quando conectado.
- Comunidade multiusuário com perfis, feed, comentários, likes, reposts, favoritos, follows e grupos.
- RLS social revisada para o beta; favoritos ficam privados e membros de grupos privados não ficam globalmente expostos.
- Upload de imagens da comunidade via Supabase Storage (`social-media`) em contas conectadas; modo local continua usando leitura local.
- Feedback in-app em `/feedback`, incluindo bugs e interesse no Pro.
- Planos continuam sem cobrança. Nenhuma integração Asaas foi ativada nesta entrega.
- Importador de edital não derruba mais a análise inteira quando um chunk volta fora do schema: normaliza respostas, repete e aceita resultado parcial com aviso.
- Relatórios/exportação já existentes preservados.
- Checklist de aceite em `docs/beta-release.md`.

## Banco

Aplicar migrations `001` a `007`, em ordem. A nova migration obrigatória é:

`supabase/migrations/007_beta_readiness.sql`

## Validação executada

- `npm run test`: 10/10 testes passaram.
- `npm run typecheck`: passou.
- `npm run lint`: passou.
- `npm run build -- --webpack`: não pôde ser concluído neste ambiente porque o Next tentou baixar `@next/swc-linux-x64-gnu` e a rede externa está bloqueada. Não houve erro de código antes desse bloqueio de infraestrutura.

## Antes de divulgar

Execute o checklist `docs/beta-release.md` com duas contas reais e dois navegadores/perfis diferentes. Não ativar cobrança antes desse teste.
