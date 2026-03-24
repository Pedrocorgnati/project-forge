# Event Bus — module-4

## Fluxo de Eventos

```
caller → EventBus.publish() → Event (DB) → pg_notify → Supabase Realtime → useRealtimeEvents hook
```

## Decisões de Design

### Por que pg_notify via Supabase e não webhooks HTTP?
- **Latência:** pg_notify é síncrono com o INSERT — entrega < 100ms em condições normais
- **Confiabilidade:** qualquer INSERT na tabela `events` (inclusive por migrações) dispara o trigger
- **Simplicidade:** Supabase Realtime já expõe pg_notify como canal — zero infraestrutura adicional

### Por que anti-fadiga em DB e não Redis?
- **Simplicidade:** Supabase (PostgreSQL) já está disponível; Redis adicionaria dependência e custo
- **Suficiência:** janela de 5min com limite de 3 por tipo é adequada para o volume esperado
- Referência: `NOTIFICATION_LIMITS` em `src/lib/constants/notifications.ts`

## Restrições

- **NUNCA** importar de módulos de feature (module-5+) neste módulo
- Todos os módulos de feature publicam eventos via `EventBus.publish()` — nunca chamam serviços de notificação diretamente
- `POST /api/events` é interno — nunca expor publicamente sem `X-Internal-Secret`

## Estrutura

```
src/lib/events/
├── types.ts          # Re-export EventType + EventPayload tipados
├── bus.ts            # EventBus.publish() — ponto único de publicação
├── broadcaster.ts    # EventBroadcaster — pg_notify server-side
├── worker.ts         # EventWorker — processamento de eventos pendentes
├── index.ts          # Barrel export
└── handlers/         # Um handler por domínio de evento
    ├── index.ts      # Registry de handlers por EventType
    ├── brief-handlers.ts
    ├── estimate-handlers.ts
    ├── scope-handlers.ts
    ├── approval-handlers.ts
    └── project-handlers.ts
```
