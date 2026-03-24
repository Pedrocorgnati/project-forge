-- Migration: pgvector extension
-- Deve ser executada ANTES da migration init (schema completo)
-- Marcar como aplicada: npx prisma migrate resolve --applied 20260313000001_pgvector

CREATE EXTENSION IF NOT EXISTS vector;
