#!/usr/bin/env -S npx ts-node

/**
 * Seed de usuários de teste - gerado por /create-test-user
 *
 * Uso:
 *   npx ts-node scripts/seed-test-users.ts
 *
 * Este script é idempotente: se os usuários já existem, apenas atualiza os dados.
 * Pode ser executado múltiplas vezes com segurança.
 *
 * Pré-requisitos:
 *   1. Supabase: Criar usuários em Authentication > Users:
 *      - admin4testing@corgnati.com
 *      - lead4testing@corgnati.com
 *      - dev@project-forge.test
 *      - clien4testing@corgnati.com
 *   2. Copiar os UUIDs do Supabase e substituir abaixo em SUPABASE_USER_IDS
 *
 * Obs: Este script usa emails fixos. Para criar usuários com emails customizados,
 * adapte a seção USERS_DATA abaixo.
 */

import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO: IDs do Supabase (copie dos usuários criados em Supabase Console)
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_USER_IDS = {
  admin: process.env.SEED_SOCIO_ID ?? '00000000-0000-0000-0000-000000000001',
  lead: process.env.SEED_PM_ID ?? '00000000-0000-0000-0000-000000000002',
  dev: process.env.SEED_DEV_ID ?? '00000000-0000-0000-0000-000000000003',
  cliente: process.env.SEED_CLIENTE_ID ?? '00000000-0000-0000-0000-000000000004',
}

// ─────────────────────────────────────────────────────────────────────────────
// DADOS DOS USUÁRIOS DE TESTE
// ─────────────────────────────────────────────────────────────────────────────

const USERS_DATA = [
  {
    id: SUPABASE_USER_IDS.admin,
    email: 'admin4testing@corgnati.com',
    name: 'Adminston Testwell',
    role: UserRole.SOCIO,
    avatarUrl:
      'https://ui-avatars.com/api/?name=Adminston+Testwell&background=random&size=200',
  },
  {
    id: SUPABASE_USER_IDS.lead,
    email: 'lead4testing@corgnati.com',
    name: 'Leadsandro Testeodoro',
    role: UserRole.PM,
    avatarUrl:
      'https://ui-avatars.com/api/?name=Leadsandro+Testeodoro&background=random&size=200',
  },
  {
    id: SUPABASE_USER_IDS.dev,
    email: 'dev@project-forge.test',
    name: 'Carlos Oliveira',
    role: UserRole.DEV,
    avatarUrl:
      'https://ui-avatars.com/api/?name=Carlos+Oliveira&background=random&size=200',
  },
  {
    id: SUPABASE_USER_IDS.cliente,
    email: 'clien4testing@corgnati.com',
    name: 'Clienzo Testavero',
    role: UserRole.CLIENTE,
    avatarUrl:
      'https://ui-avatars.com/api/?name=Clienzo+Testavero&background=random&size=200',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seed de usuários de teste iniciado...\n')

  // Etapa 1: Obter ou criar organização padrão
  console.log('📦 Buscando organização padrão...')
  let org = await prisma.organization.findFirst({
    where: { slug: 'project-forge' },
  })

  if (!org) {
    console.log('  → Criando nova organização "Test Organization"')
    org = await prisma.organization.create({
      data: {
        name: 'Test Organization',
        slug: 'test-org',
      },
    })
  } else {
    console.log(`  ✓ Organização encontrada: ${org.name}`)
  }

  const orgId = org.id

  // Etapa 2: Criar/atualizar usuários
  console.log('\n👥 Criando/atualizando usuários de teste...\n')

  const createdUsers = []

  for (const userData of USERS_DATA) {
    const roleDisplay = `[${userData.role}]`
    const emailDisplay = userData.email

    // Verificar se usuário já existe
    const existing = await prisma.user.findUnique({
      where: { email: userData.email },
    })

    if (existing) {
      console.log(
        `  ⟳ ${roleDisplay} ${emailDisplay} - já existe (atualizando)...`
      )
      await prisma.user.update({
        where: { email: userData.email },
        data: {
          name: userData.name,
          role: userData.role,
          avatarUrl: userData.avatarUrl,
        },
      })
      createdUsers.push(userData)
      console.log(`    ✓ Atualizado com sucesso\n`)
    } else {
      console.log(`  + ${roleDisplay} ${emailDisplay} - criando novo...`)
      try {
        const newUser = await prisma.user.create({
          data: {
            id: userData.id,
            organizationId: orgId,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            avatarUrl: userData.avatarUrl,
          },
        })
        createdUsers.push(userData)
        console.log(`    ✓ Criado com sucesso (UUID: ${newUser.id})\n`)
      } catch (e) {
        if ((e as any).code === 'P2002') {
          // Email ou UUID duplicado
          console.error(
            `    ✗ ERRO: Email ou UUID já existe no banco. Verifique se Supabase e PostgreSQL estão sincronizados.\n`
          )
        } else {
          console.error(`    ✗ ERRO: ${(e as any).message}\n`)
        }
      }
    }
  }

  // Etapa 3: Resumo
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ SEED COMPLETO')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Usuários de teste: ${createdUsers.length}/4`)
  console.log(`Organização: ${org.name} (${orgId})`)
  console.log(`\nCredenciais de teste estão em: test-users.md\n`)

  // Etapa 4: Verificação de relação with projectos (se existirem)
  const projectCount = await prisma.project.count({
    where: { organizationId: orgId },
  })
  if (projectCount > 0) {
    console.log(`ℹ️  ${projectCount} projeto(s) encontrado(s) na organização`)
    console.log(
      '   → Os usuários de teste podem acessar estes projetos\n'
    )
  }

  console.log(
    '💡 Próximas etapas:\n' +
      '   1. Execute: npm run dev\n' +
      '   2. Acesse: http://localhost:3000/login\n' +
      '   3. Use as credenciais de test-users.md\n'
  )
}

main()
  .catch((e) => {
    console.error('❌ Seed falhou:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
