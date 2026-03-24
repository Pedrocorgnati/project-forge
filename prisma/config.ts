import { defineConfig } from 'prisma/config'

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL!,
    // DIRECT_URL: conexão direta (porta 5432) — obrigatória para migrations
    // Evita timeout do PgBouncer durante operações DDL longas
    shadowDatabaseUrl: process.env.DIRECT_URL,
  },
})
