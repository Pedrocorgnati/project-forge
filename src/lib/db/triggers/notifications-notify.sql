-- ─── TRIGGER: notify notifications ────────────────────────────────────────────
-- Dispara pg_notify no canal 'notifications:{user_id}' após cada INSERT
-- na tabela notifications. Garante entrega in-app mesmo sem o InAppChannel
-- broadcast explícito.
--
-- Aplicar: psql $DATABASE_URL -f src/lib/db/triggers/notifications-notify.sql
-- Ou: copiar no Supabase SQL Editor

-- Habilitar Realtime na tabela notifications
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Função de trigger
CREATE OR REPLACE FUNCTION notify_new_notification()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'notifications:' || NEW.user_id::text,
    row_to_json(NEW)::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger (idempotente)
DROP TRIGGER IF EXISTS trg_notify_new_notification ON notifications;
CREATE TRIGGER trg_notify_new_notification
  AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION notify_new_notification();
