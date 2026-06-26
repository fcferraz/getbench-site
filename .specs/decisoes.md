# Buskai — Decisões Técnicas

## Stack
- Astro SSR escolhido por performance e SEO
- Airtable como banco de dados do diretório (não PostgreSQL)
- Vercel para deploy — push para main = deploy automático
- aurora theme (commit 4296fcc)

## Segurança
- Chave Airtable com acesso limitado à base appFwfYV1xtqMcEMg
- 8 vulnerabilidades XSS corrigidas
- Security headers implementados
- Rate limiting ativo
- LGPD cookie consent implementado

## SEO
- AuthorBox com marca pessoal do Filipe para E-E-A-T
- Páginas de alternativas para pSEO
- GSC indexando ~52 páginas

## Paginação Airtable
- Implementada com do/while + offset
- Bug corrigido: loop infinito na paginação

## Enriquecimento editorial
- Ferramentas enriquecidas via Firecrawl + Claude
- Campos: pricing, pros/cons editoriais, funciona_no_brasil, suporte_pt, aceita_brl
