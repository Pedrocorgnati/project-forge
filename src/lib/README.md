# src/lib

Biblioteca central de utilidades, serviços e hooks do ProjectForge.

## Estrutura

| Diretório/Arquivo | Descrição |
|-------------------|-----------|
| `ai/` | Clients e helpers para integração com módulos de IA (BriefForge, EstimaAI, HandoffAI) |
| `api/` | Funções de chamada à API, wrappers de fetch e tratamento de erros HTTP |
| `constants/` | Constantes globais da aplicação (rotas, limites, enums de domínio) |
| `db/` | Configuração de banco de dados e queries reutilizáveis |
| `events/` | Sistema de eventos internos e event emitters |
| `hooks/` | React hooks customizados compartilhados entre features |
| `rbac/` | Lógica de controle de acesso baseado em roles (permissões, guards) |
| `realtime/` | Configuração e helpers para comunicação em tempo real |
| `schemas/` | Schemas de validação (Zod) reutilizáveis |
| `services/` | Serviços de domínio e integrações externas |
| `supabase/` | Client e helpers específicos do Supabase |
| `utils/` | Funções utilitárias genéricas (formatação, cn, etc.) |
| `auth.ts` | Helpers de autenticação |
| `db.ts` | Instância/configuração principal do banco |
| `errors.ts` | Classes e tipos de erro padronizados |
| `index.ts` | Barrel export principal |
| `rbac.ts` | Export de conveniência para RBAC |
| `utils.ts` | Export de conveniência para utils |

## Padrão de importação

Utilize o barrel export para imports limpos:

```ts
import { cn, formatCurrency } from '@/lib'
import { useDebounce } from '@/lib/hooks'
import { aiClient } from '@/lib/ai'
```

Evite imports diretos de arquivos internos dos subdiretórios quando o barrel já os exporta.
