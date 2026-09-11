# Primeira camada de colaboração

Rotas: `/comunidade`, `/comunidade/[id]` e `/perfil`. As páginas de estudo continuam nas mesmas rotas.

Criar grupos, entrar, sair e publicar funcionam no navegador. O armazenamento `studify.community.v1.<userId>` separa contas; o modo local usa `local-user`. Não há compartilhamento entre dispositivos ou pessoas. A UI informa essa limitação, inclusive nas opções privado/grupo/público. Os seis grupos iniciais, seus participantes e publicações são exemplos fictícios. O feed é cronológico, sem algoritmo.

Notas, resumos, progresso e sessões concluídas têm tipos próprios de conteúdo. Progresso captura as métricas calculadas da semana no momento da publicação. Uma sessão compartilhada referencia uma sessão real concluída. O perfil usa os registros reais de estudo. O agregado de grupo soma o último retrato de progresso visível de cada autor; não é uma estatística ao vivo nem um ranking.

## Estrutura para persistência futura

- `users`: identidade existente em `auth.users`.
- `profiles`: perfil existente; `CommunityProfile` representa a projeção social.
- `groups` / `group_members`: `StudyGroup` / `GroupMember`.
- `posts`: `CommunityPost`, com tipo, autor, grupo, visibilidade e data.
- `shared_notes` / `shared_summaries`: `SharedNote` / `SharedSummary`, atualmente variantes de publicação.
- `study_sessions`: entidade existente; publicações guardam `sessionId`.
- `study_progress`: `StudyProgress`, retrato calculado, não fornecido pelo LLM.

Não foi adicionada migration social. Antes de habilitar compartilhamento real, será necessário migrar essas entidades, impor autorização e visibilidade no servidor e definir exclusão/retenção. A filtragem local é uma demonstração da experiência, não uma fronteira de segurança.

“Estudar juntos” está desabilitado e identificado como futuro. Recomendações sociais por IA, chat, vídeo, mensagens, ranking e notificações não foram implementados. A futura IA poderá consumir projeções autorizadas dessas entidades sem substituir as métricas determinísticas.
