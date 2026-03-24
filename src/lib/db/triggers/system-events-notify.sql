-- ─── TRIGGER: notify system_events ───────────────────────────────────────────
-- Dispara pg_notify no canal 'system_events' após cada INSERT na tabela events.
-- Permite que Supabase Realtime entregue eventos em tempo real aos subscribers.
--
-- Aplicar: psql $DATABASE_URL -f src/lib/db/triggers/system-events-notify.sql
-- Ou: copiar no Supabase SQL Editor

-- Habilitar Realtime na tabela events
ALTER TABLE events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE events;

-- Função de trigger
CREATE OR REPLACE FUNCTION notify_system_event()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'system_events',
    json_build_object(
      'type',       NEW.type,
      'project_id', NEW.project_id,
      'payload',    NEW.payload,
      'id',         NEW.id,
      'created_at', NEW.created_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger (idempotente — pode rodar múltiplas vezes)
DROP TRIGGER IF EXISTS trg_notify_system_event ON events;
CREATE TRIGGER trg_notify_system_event
  AFTER INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION notify_system_event();
