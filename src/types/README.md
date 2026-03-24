# src/types

Tipos TypeScript centrais do ProjectForge.

## Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `entities.ts` | Tipos de entidades de domínio (Project, User, Module, Task, etc.) |
| `api.ts` | Tipos de request/response da API, payloads e paginação |
| `utils.ts` | Tipos utilitários genéricos (DeepPartial, Nullable, etc.) |
| `guards.ts` | Type guards e narrowing functions para validação em runtime |
| `contracts.ts` | Contratos de interface entre módulos e camadas |
| `index.ts` | Barrel export principal |

## Padrão de importação

Utilize o barrel export para imports limpos:

```ts
import type { Project, User } from '@/types'
import { isProject } from '@/types/guards'
```

## Convenções

- Entidades usam `interface`, utilitários usam `type`
- Guards retornam `value is Type` para narrowing seguro
- Contracts definem os shapes esperados entre camadas (UI, service, API)
