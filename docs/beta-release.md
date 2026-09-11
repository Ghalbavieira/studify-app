# Beta público — checklist de liberação

## Banco

Aplique as migrations `001` até `007` em ordem no Supabase. A `007_beta_readiness.sql` fecha os pontos do beta social: restringe favoritos, ajusta a visibilidade de membros de grupos, cria feedback e prepara o bucket público `social-media` para imagens postadas voluntariamente na comunidade.

## Ambiente

Frontend:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Servidor, apenas se a leitura automática de edital estiver habilitada:

```env
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-20b
```

Nunca exponha `GROQ_API_KEY` ou uma Supabase service-role key com prefixo `NEXT_PUBLIC_`.

## Teste de aceite antes de divulgar

1. Conta A: criar conta, confirmar e-mail se exigido, entrar e sair.
2. Conta A: criar objetivo, matérias e tópicos; fechar navegador e confirmar persistência ao voltar.
3. Conta A: montar bloco, iniciar/finalizar sessão e registrar questões; confirmar atualização de Hoje/Painel/Análises.
4. Conta A: salvar fechamento diário e confirmar que reaparece após recarregar.
5. Conta A: publicar texto e imagem na Comunidade e criar/entrar em grupo público.
6. Conta B, em outro navegador/perfil: não deve ver estudos privados da Conta A; deve ver publicação pública, curtir, comentar, seguir e entrar em grupo público.
7. Conta A: confirmar a interação da Conta B.
8. Recuperação de senha: solicitar link e definir nova senha.
9. Feedback: enviar uma avaliação e um bug em `/feedback`.
10. Relatório: abrir `/relatorios`, selecionar período e usar a impressão do navegador para PDF.

## Escopo deliberadamente fora do bloqueio do beta

- Cobrança real e Asaas: não habilitados antes da validação com os primeiros usuários.
- Plano Pro: apenas apresentação/validação de interesse; nenhum usuário deve ser cobrado.
- Edital com IA: beta. Falha de um bloco não derruba mais toda a análise, mas PDFs escaneados ainda precisam de OCR e a revisão humana continua obrigatória.
- Backend separado: não é necessário para esta rodada; Next.js + Supabase formam a camada de aplicação e dados do MVP.
