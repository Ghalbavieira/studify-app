# Studify — versão utilizável

## Resultado esperado

Um estudante define prova, prazo, matérias e tópicos; monta a semana; executa sessões; registra tempo, questões e acertos; acompanha revisões e recalls; recebe prioridades baseadas exclusivamente nos seus dados.

## Ordem de implementação

1. Agenda semanal editável: duração, descrição, movimentação, conclusão e persistência.
2. Modelo estruturado e validado: objetivo, matérias ponderadas, tópicos, blocos, sessões, revisões e recalls.
3. Motor determinístico testado: métricas, amostras de questões, tendência, execução, atraso, recência e proximidade da prova.
4. Cadastro e edição do objetivo/prova; matérias e tópicos reais.
5. Cronômetro vinculado a um bloco/tópico; registro de execução e desempenho.
6. Dashboard e análises com métricas calculadas; fila de revisões e recalls.
7. Recomendação de próximo estudo e reajustes revisáveis; explicações da IA sem autoridade sobre números.
8. Verificação de ponta a ponta, exportação de dados e documentação de limites.

## Contratos

- Não misturar dados fictícios de demonstração com registros reais.
- Dados desconhecidos permanecem desconhecidos; ausência de respostas não significa 0% de acerto.
- Questões e acertos são inteiros e acertos não excedem questões.
- Métricas agregam numeradores e denominadores, sem médias de percentuais distorcidas.
- O cálculo de prioridades é versionado e retorna motivos e evidências.
- Nenhum LLM altera dados de execução, decide a pontuação ou grava reajustes sem ação do usuário.
- Revisões/recalls só são concluídos por registros explícitos; cancelar cronômetro não inventa execução.
- Mudanças de plano preservam blocos concluídos.
- Cores sólidas da referência, sem gradientes, cantos até 10px.

## Persistência

A agenda básica usa armazenamento local. Login e sincronização dependem da preferência de uso e da configuração do Supabase. As variáveis Supabase existem, mas estão vazias no ambiente atual. O núcleo de domínio será independente do provedor de persistência.
