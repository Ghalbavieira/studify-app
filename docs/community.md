# Comunidade

A comunidade do MVP usa Supabase quando o usuário está autenticado. Publicações, comentários, curtidas, reposts, seguidores, grupos e membros ficam compartilhados entre contas reais. No modo local, sem Supabase, o app mantém a demonstração isolada no navegador.

## Banco

A migration `006_social_mvp.sql` cria:

- `social_profiles`
- `social_groups`
- `social_group_members`
- `social_posts`
- `social_comments`
- `social_follows`
- `social_likes`
- `social_reposts`
- `social_bookmarks`

As tabelas usam RLS. Perfis sociais, posts públicos, curtidas, reposts e relações de follow podem ser lidos por usuários autenticados. Escrita e exclusão permanecem limitadas ao dono do recurso. Favoritos são privados. Posts de grupo exigem participação no grupo.

## Grupos

Cinco grupos públicos iniciais são criados pela migration para que o beta não comece vazio. Grupos privados ficam visíveis para o criador e membros. Nesta etapa não existe fluxo de convite/aprovação para grupos privados.

## Limites do MVP

- Imagens sociais ainda são armazenadas como data URL no campo correspondente. Isso serve para o beta pequeno, mas deve migrar para Supabase Storage antes de escala.
- A atualização entre contas ocorre ao carregar a tela e ao voltar/focar a aba; realtime ficará para uma evolução posterior.
- Moderação, denúncia e bloqueio ainda precisam ser fechados antes de uma abertura ampla.
