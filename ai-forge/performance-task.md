# Performance Task List — ProjectForge
> Gerado por `/nextjs:performance` em 2026-03-23
> workspace: `output/workspace/project-forge`

---

## Resumo Executivo

| Categoria | Achados | Prioridade |
|-----------|---------|-----------|
| React Query não utilizado em 15 de 20 hooks | Cache, dedup e retry ausentes | ALTA |
| NavItem chama usePathname() individualmente | 10+ subscriptions por rota | ALTA |
| Nenhum React.memo em itens de lista | Re-renders desnecessários | ALTA |
| Inline arrow function em KanbanBoard | Nova referência a cada render de `columns` | MÉDIA |
| Sem dynamic() para modais pesados | Bundle inicial maior | MÉDIA |
| ReactQueryDevtools em todos os ambientes | Código de dev em produção | MÉDIA |
| 9 useState em BriefSessionChat | Renders cascata em chat streaming | MÉDIA |
| Regex pathname.match() sem memo no Sidebar | Re-execução a cada render | BAIXA |
| Web Vitals sem instrumentação manual | LCP/CLS/INP não rastreados | BAIXA |

---

## Tasks

### T001 – Migrar hooks manuais para React Query
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Status:** PENDING — requer refactoring manual de 15 hooks; deixado como task para próxima sessão

**Arquivos:**
- modificar: `src/hooks/use-change-orders.ts`
- modificar: `src/hooks/use-baselines.ts`
- modificar: `src/hooks/use-checkpoints.ts`
- modificar: `src/hooks/use-checkpoint-comparison.ts`
- modificar: `src/hooks/use-board-mutations.ts`
- modificar: `src/hooks/use-cost-config.ts`
- modificar: `src/hooks/use-pl-preview.ts`
- modificar: `src/hooks/use-profit-report.ts`
- modificar: `src/hooks/use-project-impact.ts`
- modificar: `src/hooks/use-scope-alerts.ts`
- modificar: `src/hooks/use-scope-validation-status.ts`
- modificar: `src/hooks/use-timesheet.ts`
- modificar: `src/hooks/use-timesheet-summary.ts`
- modificar: `src/hooks/use-burn-rate-timeline.ts`
- modificar: `src/hooks/use-board-realtime.ts`
- referência: `src/lib/constants/query-keys.ts` (expandir com novas query keys)

**Descrição:**
Os 5 hooks de estimates (`src/hooks/estimates/`) já usam `useQuery`/`useMutation` do React Query v5. Os 15 hooks restantes usam o padrão manual `useState + useEffect + fetch`, que não oferece:
- **Caching**: mesma requisição repetida em múltiplos componentes
- **Deduplication**: fetch duplicado em mount simultâneo
- **Background refetch**: dados desatualizados sem o usuário saber
- **Retry automático**: configurado como 2 tentativas no QueryClient mas inacessível

Padrão alvo (baseado nos hooks de estimates já migrados):
```typescript
// ANTES (use-change-orders.ts)
export function useChangeOrders(projectId: string, statusFilter?: string) {
  const [changeOrders, setChangeOrders] = useState<ChangeOrderData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const refresh = useCallback(async () => { ... }, [projectId, statusFilter])
  useEffect(() => { refresh() }, [refresh])
  return { changeOrders, loading, error, refresh }
}

// DEPOIS
export function useChangeOrders(projectId: string, statusFilter?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.changeOrders.byProject(projectId, statusFilter),
    queryFn: async () => {
      const params = statusFilter ? `?status=${statusFilter}` : ''
      const res = await fetch(`/api/projects/${projectId}/change-orders${params}`)
      if (!res.ok) throw new Error('Erro ao carregar change orders')
      return res.json() as Promise<ChangeOrderData[]>
    },
    staleTime: 30_000,
  })
}
```

Para mutações (`use-board-mutations.ts`), usar `useMutation` com `onMutate` para optimistic updates (o hook já implementa rollback via `useRef` — migrar para `context` do useMutation).

**Critérios de Aceite:**
- [ ] Todos os 15 hooks usam `useQuery` ou `useMutation`
- [ ] `QUERY_KEYS` expandido com chaves para cada domínio
- [ ] Nenhum `useState([])` + `useEffect(fetch)` pattern restante nos hooks
- [ ] `queryClient.invalidateQueries()` chamado após mutações para manter cache sincronizado
- [ ] `use-board-realtime.ts` usa `queryClient.setQueryData()` para atualizar cache via Supabase realtime

**Estimativa:** 8h

---

### T002 – Mover usePathname() para Sidebar (evitar 10+ subscriptions)
**Tipo:** SEQUENTIAL
**Dependências:** none
**Status:** COMPLETED

**Arquivos:**
- modificar: `src/components/layout/sidebar.tsx`

**Descrição:**
`NavItem` (`sidebar.tsx:47-69`) é um componente filho que chama `usePathname()` individualmente. Com ~10 itens de navegação renderizados, isso cria **10+ subscriptions separadas** ao mesmo hook de rota. Em cada navegação, todos os 10 componentes são re-renderizados.

O `Sidebar` já chama `usePathname()` na linha 79. A solução é passar `pathname` como prop para `NavItem` em vez de chamar o hook dentro do componente filho:

```typescript
// ANTES: NavItem chama usePathname() internamente (linha 48)
function NavItem({ label, href, icon: Icon, testId }: NavItemProps) {
  const pathname = usePathname()  // ← 10x hook subscription
  const isActive = pathname === href || pathname.startsWith(href + '/')
  ...
}

// DEPOIS: pathname como prop
interface NavItemProps {
  ...
  pathname: string  // ← recebe do parent
}
function NavItem({ label, href, icon: Icon, testId, pathname }: NavItemProps) {
  const isActive = pathname === href || pathname.startsWith(href + '/')
  ...
}

// Sidebar passa pathname para cada NavItem
<NavItem key={item.href} {...item} pathname={pathname} />
```

**Critérios de Aceite:**
- [ ] `usePathname()` chamado apenas 1x no componente `Sidebar`
- [ ] `NavItem` recebe `pathname: string` como prop
- [ ] Todos os `.map()` de navItems/moduleItems/bottomItems/projectNavItems passam `pathname`
- [ ] Comportamento de active state idêntico ao anterior
- [ ] Testes de navegação passando

**Estimativa:** 1h

---

### T003 – React.memo em componentes de lista
**Tipo:** PARALLEL-GROUP-2
**Dependências:** T002
**Status:** COMPLETED

**Arquivos:**
- modificar: `src/components/layout/sidebar.tsx` (NavItem)
- modificar: `src/components/board/KanbanColumn.tsx`
- modificar: `src/components/board/TaskCard.tsx`
- modificar: `src/components/change-orders/ChangeOrderCard.tsx` (se existir)

**Descrição:**
Nenhum componente de lista usa `React.memo`. Com o padrão atual:
- **NavItem**: re-renderiza quando Sidebar re-renderiza (ex: `isOpen` muda no mobile), mesmo que `pathname` e `href` não mudem
- **KanbanColumn**: re-renderiza quando qualquer state do `KanbanBoard` muda, mesmo que a coluna não tenha mudado
- **TaskCard**: re-renderiza quando a lista inteira de tasks muda por qualquer drag

Aplicar `React.memo` com comparação superficial (default):

```typescript
// NavItem — após T002 (pathname como prop)
const NavItem = React.memo(function NavItem({ label, href, icon: Icon, testId, pathname }: NavItemProps) {
  ...
})

// TaskCard
export const TaskCard = React.memo(function TaskCard({ task, overlay }: TaskCardProps) {
  ...
})

// KanbanColumn — cuidado: recebe `tasks` array
// Precisa de comparação estável: tasks[] com mesmas referências → não re-renderiza
export const KanbanColumn = React.memo(function KanbanColumn(props: KanbanColumnProps) {
  ...
})
```

**Critérios de Aceite:**
- [ ] `NavItem`, `TaskCard`, `KanbanColumn` envolvidos em `React.memo`
- [ ] Componentes de ChangeOrder (se tiver lista) também com memo
- [ ] React Profiler confirma redução de renders em navegação e drag
- [ ] Nenhum teste quebrado

**Estimativa:** 2h

---

### T004 – Memoizar handler onCreateTask no KanbanBoard
**Tipo:** SEQUENTIAL
**Dependências:** none
**Status:** COMPLETED

**Arquivos:**
- modificar: `src/components/board/KanbanBoard.tsx`

**Descrição:**
Na linha 171 de `KanbanBoard.tsx`, o handler `onCreateTask` é uma arrow function inline:

```typescript
// ANTES (linha 171)
onCreateTask={() => setCreateModalOpen(true)}
```

Esse handler é recriado a cada render do `KanbanBoard`. Como `columns` é derivado de `tasks` via `useMemo`, qualquer mudança em `tasks` (drag, realtime) re-renderiza o board e cria nova referência para `onCreateTask`, forçando re-render de `KanbanColumn` mesmo quando `memo` estiver aplicado.

```typescript
// DEPOIS — adicionar junto com outros useCallback handlers
const handleCreateModalOpen = useCallback(() => {
  setCreateModalOpen(true)
}, [])

// E no JSX:
onCreateTask={handleCreateModalOpen}
```

**Critérios de Aceite:**
- [ ] `handleCreateModalOpen` usa `useCallback` com deps `[]`
- [ ] `onCreateTask` prop em todos os `KanbanColumn` usa a referência estável
- [ ] KanbanColumn com React.memo (T003) não re-renderiza por mudança de tasks quando `onCreateTask` está estável

**Estimativa:** 30min

---

### T005 – Dynamic imports para modais pesados
**Tipo:** PARALLEL-GROUP-3
**Dependências:** none
**Status:** COMPLETED (CreateTaskModal); TaskDetailSheet e modais de change-orders/approvals ficam como PENDING para próxima sessão

**Arquivos:**
- modificar: `src/components/board/KanbanBoard.tsx`
- modificar: `src/components/board/TaskDetailSheet.tsx` (se for modal)
- modificar: páginas de change-orders que importam `ChangeOrderDetail`
- modificar: páginas de approvals que importam modais de aprovação

**Descrição:**
Componentes como `CreateTaskModal`, `TaskDetailSheet`, `ChangeOrderDetail` e modais de aprovação são importados estaticamente, aumentando o bundle inicial. Esses componentes só são necessários mediante interação do usuário.

```typescript
// ANTES (KanbanBoard.tsx linha 21)
import { CreateTaskModal } from './CreateTaskModal'

// DEPOIS
import dynamic from 'next/dynamic'
const CreateTaskModal = dynamic(() => import('./CreateTaskModal').then(m => ({ default: m.CreateTaskModal })), {
  loading: () => null,
  ssr: false,
})
```

Candidatos a `dynamic()`:
- `CreateTaskModal` (renderizado condicionalmente com `config.canCreateTask && open`)
- `TaskDetailSheet` (sheet lateral de detalhes)
- `ChangeOrderDetail` (modal de detalhes com fetch próprio)
- Modais de aprovação/rejeição (`ApprovalResponseForm`)

**Critérios de Aceite:**
- [ ] `CreateTaskModal` usa `dynamic()` com `ssr: false`
- [ ] Demais modais identificados acima usam `dynamic()`
- [ ] `npm run build` não lança warnings de chunk grande para esses componentes
- [ ] UX idêntica (loading state: `null` para modais é aceitável — aparecem somente após click)

**Estimativa:** 2h

---

### T006 – Guard de NODE_ENV para ReactQueryDevtools
**Tipo:** SEQUENTIAL
**Dependências:** none
**Status:** COMPLETED

**Arquivos:**
- modificar: `src/providers/query-client.tsx`

**Descrição:**
`ReactQueryDevtools` é renderizado incondicionalmente em `query-client.tsx:24`. Embora o Next.js possa tree-shaken em produção dependendo da configuração, o padrão recomendado é guardar explicitamente:

```typescript
// ANTES (linha 24)
<ReactQueryDevtools initialIsOpen={false} />

// DEPOIS
{process.env.NODE_ENV === 'development' && (
  <ReactQueryDevtools initialIsOpen={false} />
)}
```

**Critérios de Aceite:**
- [ ] `ReactQueryDevtools` renderizado apenas em `NODE_ENV === 'development'`
- [ ] `npm run build` (produção) não inclui devtools no bundle

**Estimativa:** 10min

---

### T007 – Refatorar BriefSessionChat para useReducer
**Tipo:** SEQUENTIAL
**Dependências:** none
**Status:** PENDING — requer refactoring de lógica de streaming complexa; deixado para próxima sessão

**Arquivos:**
- modificar: `src/app/(app)/briefforge/[projectId]/_components/brief-session-chat.tsx`

**Descrição:**
`BriefSessionChat` tem 9 `useState` separados (linhas 37-45): `messages`, `currentSession`, `currentQuestionId`, `isStarting`, `isSubmitting`, `isStreaming`, `isDegraded`, `answeredCount`, `sessionCompleted`. Cada setState independente dispara um render separado — em fluxos de streaming onde múltiplos estados mudam simultaneamente (ex: `isStreaming=true` + novo message), isso gera **cascata de renders**.

Consolidar estados relacionados em `useReducer`:

```typescript
type ChatState = {
  messages: Message[]
  currentSession: Session | null
  currentQuestionId: string | null
  answeredCount: number
  sessionCompleted: boolean
  status: 'idle' | 'starting' | 'submitting' | 'streaming' | 'degraded'
}

type ChatAction =
  | { type: 'SESSION_START' }
  | { type: 'SESSION_LOADED'; session: Session; questionId: string }
  | { type: 'STREAM_BEGIN' }
  | { type: 'MESSAGE_ADDED'; message: Message }
  | { type: 'STREAM_END'; answeredCount: number }
  | { type: 'SESSION_COMPLETE' }
  | { type: 'DEGRADED' }
```

**Critérios de Aceite:**
- [ ] 9 useState consolidados em 1 useReducer
- [ ] Transições de streaming (`isStarting → isStreaming → idle`) em dispatch único
- [ ] Funcionalidade de chat idêntica
- [ ] Testes existentes passando

**Estimativa:** 3h

---

### T008 – Memoizar regex de pathname no Sidebar
**Tipo:** SEQUENTIAL
**Dependências:** T002
**Status:** COMPLETED

**Arquivos:**
- modificar: `src/components/layout/sidebar.tsx`

**Descrição:**
Na linha 82 de `sidebar.tsx`, um regex é executado a cada render:

```typescript
// ANTES (linha 82)
const projectMatch = pathname.match(/^\/projects\/([^/]+)/)
```

Com `useMemo`, o regex só re-executa quando `pathname` muda:

```typescript
// DEPOIS
const currentProjectId = useMemo(() => {
  return pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? null
}, [pathname])
```

**Critérios de Aceite:**
- [ ] `pathname.match()` envolvido em `useMemo([pathname])`
- [ ] `projectNavItems` derivado de `currentProjectId` (já condicional, não precisa de memo extra)

**Estimativa:** 15min

---

### T009 – Instrumentação de Web Vitals (onLCP, onCLS, onINP)
**Tipo:** SEQUENTIAL
**Dependências:** none
**Status:** COMPLETED (utility criada em src/lib/performance/web-vitals.ts); requer `npm install web-vitals` para ativar logging

**Arquivos:**
- criar: `src/lib/performance/web-vitals.ts`
- modificar: `src/app/layout.tsx`

**Descrição:**
O projeto usa Vercel Analytics (que reporta Web Vitals automaticamente para o dashboard da Vercel) e Speed Insights. Contudo, não há instrumentação manual com `web-vitals` para envio personalizado ou logging de baseline.

Adicionar instrumentação para ter métricas antes/depois das otimizações:

```typescript
// src/lib/performance/web-vitals.ts
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals'

export function reportWebVitals() {
  onLCP(({ value, rating }) => {
    console.debug(`[Vitals] LCP: ${value.toFixed(0)}ms (${rating})`)
  })
  onCLS(({ value, rating }) => {
    console.debug(`[Vitals] CLS: ${value.toFixed(4)} (${rating})`)
  })
  onINP(({ value, rating }) => {
    console.debug(`[Vitals] INP: ${value.toFixed(0)}ms (${rating})`)
  })
  onFCP(({ value }) => {
    console.debug(`[Vitals] FCP: ${value.toFixed(0)}ms`)
  })
  onTTFB(({ value }) => {
    console.debug(`[Vitals] TTFB: ${value.toFixed(0)}ms`)
  })
}
```

**Critérios de Aceite:**
- [ ] `web-vitals` já está em `package.json` (verificar — se não, `npm install web-vitals`)
- [ ] `reportWebVitals()` chamado no layout ou em `useEffect` de layout client
- [ ] Métricas LCP/CLS/INP logadas no console em dev
- [ ] Baseline capturado antes das otimizações das tasks anteriores

**Estimativa:** 1h

---

## Ordem de Execução Recomendada

```
T009 (baseline vitals) → T006 (devtools guard)
  ↓
T002 (usePathname) → T008 (memo regex)
  ↓
T003 (React.memo) → T004 (useCallback onCreateTask)
  ↓
T001 (React Query migration) → T005 (dynamic imports)
  ↓
T007 (useReducer chat)
```

## Checklist Final

- [ ] Componentes críticos usam React.memo/useMemo/useCallback corretamente (T003, T004)
- [ ] Props inline/objetos são memoizados ou extraídos (T004)
- [ ] Imports pesados substituídos e dynamic imports adicionados (T005)
- [ ] startTransition/useDeferredValue/Suspense — N/A (sem listas massivas; Suspense já em uso via Next.js loading.tsx)
- [ ] Runtime handlers com debounce/throttle — N/A (sem scroll/resize handlers identificados)
- [ ] Virtual lists — N/A (listas não ultrapassam 50 itens por coluna no Kanban)
- [ ] Web Vitals medidos e reportados (T009)
- [ ] Memory leaks/effects sem cleanup — verificados (use-board-realtime e use-estimate-realtime devem ter cleanup de subscription)
- [ ] Bundle analyzer executado (`ANALYZE=true npm run build`)
- [ ] Tasks registradas em `ai-forge/performance-task.md`
