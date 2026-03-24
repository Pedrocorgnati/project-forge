# Hardcodes Summary — ProjectForge

**Data:** 2026-03-23
**Comando:** `/nextjs:hardcodes .claude/projects/project-forge.json`

## Veredito: ✅ APROVADO

Todos os 56 hardcodes identificados foram centralizados. A infraestrutura de constantes já existia (`ROUTES`, `API`, `MESSAGES`, `TIMING`, `queryKeys`) mas estava massivamente subutilizada — a maioria dos arquivos importava nada e usava strings literais.

## Destaques

**Risco maior corrigido:** Comparações de `UserRole` com strings literais em múltiplos arquivos de servidor e cliente. Qualquer rename no enum Prisma causaria bugs silenciosos em runtime. Todos substituídos pelo enum `UserRole` de `@prisma/client`.

**Pattern problemático eliminado:** `['PM', 'SOCIO'].includes(role)` — perigoso com TypeScript pois `.includes()` em arrays literais é type-unsafe. Substituído por `role === UserRole.PM || role === UserRole.SOCIO`.

## Números

- Hardcodes encontrados: **56**
- Hardcodes corrigidos: **56**
- Arquivos de constantes criados: **1** (`storage-keys.ts`)
- Arquivos de constantes atualizados: **4** (`routes.ts`, `api-routes.ts`, `timing.ts`, `index.ts`)
- Arquivos consumidores corrigidos: **~30**

## Próximos passos recomendados

- Executar `/nextjs:typescript` para verificar se restam `import type` onde o valor é necessário
- Considerar lint rule (`no-restricted-syntax`) para barrar novos hardcodes de rotas
