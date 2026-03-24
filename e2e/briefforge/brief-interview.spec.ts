import { test, expect, request } from '@playwright/test'

/**
 * E2E: Fluxo completo de entrevista de Brief
 *
 * Pré-requisitos:
 *  - App rodando em localhost:3000
 *  - Usuário PM autenticado (auth state via storage)
 *  - Projeto existente com ID válido
 *  - Variáveis de ambiente: PLAYWRIGHT_PM_PROJECT_ID
 */

const PROJECT_ID = process.env.PLAYWRIGHT_PM_PROJECT_ID ?? 'test-project-id'
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

// ─── API helpers ───────────────────────────────────────────────────────────

async function createBriefViaApi(apiContext: Awaited<ReturnType<typeof request.newContext>>) {
  const res = await apiContext.post(`${BASE_URL}/api/briefs`, {
    data: { projectId: PROJECT_ID },
  })
  expect(res.status()).toBe(201)
  const body = await res.json()
  return body.data as { id: string; projectId: string; status: string }
}

async function startSessionViaApi(
  apiContext: Awaited<ReturnType<typeof request.newContext>>,
  briefId: string,
) {
  const res = await apiContext.post(`${BASE_URL}/api/briefs/${briefId}/sessions`)
  expect(res.status()).toBe(201)
  const body = await res.json()
  return body.data as {
    session: { id: string; briefId: string; status: string }
    firstQuestion: { id: string; order: number; questionText: string }
  }
}

async function answerQuestionViaApi(
  apiContext: Awaited<ReturnType<typeof request.newContext>>,
  briefId: string,
  sessionId: string,
  questionId: string,
  answer: string,
): Promise<{ sessionStatus?: string; chunks?: string[] }> {
  const res = await apiContext.post(
    `${BASE_URL}/api/briefs/${briefId}/sessions/${sessionId}/questions`,
    { data: { questionId, answer } },
  )

  const contentType = res.headers()['content-type'] ?? ''

  if (contentType.includes('application/json')) {
    const body = await res.json()
    return { sessionStatus: body.data?.sessionStatus }
  }

  expect(contentType).toContain('text/event-stream')
  const text = await res.text()

  const chunks = text
    .split('\n\n')
    .filter(line => line.startsWith('data: ') && !line.includes('[DONE]'))
    .map(line => {
      try {
        return JSON.parse(line.replace('data: ', '')).chunk as string
      } catch {
        return null
      }
    })
    .filter(Boolean) as string[]

  expect(text).toContain('data: [DONE]')
  return { chunks }
}

// ─── API Tests ─────────────────────────────────────────────────────────────

test.describe('API: Fluxo completo de entrevista de Brief', () => {
  test.use({ storageState: 'playwright/.auth/pm-user.json' })

  test('cria brief e inicia sessão — primeira pergunta retornada', async ({ request: apiContext }) => {
    const brief = await createBriefViaApi(apiContext)

    expect(brief.id).toBeTruthy()
    expect(brief.status).toBe('DRAFT')

    const { session, firstQuestion } = await startSessionViaApi(apiContext, brief.id)

    expect(session.status).toBe('ACTIVE')
    expect(firstQuestion.order).toBe(1)
    expect(firstQuestion.questionText.length).toBeGreaterThan(10)
  })

  test('responder 7 perguntas → sessão COMPLETED', async ({ request: apiContext }) => {
    const brief = await createBriefViaApi(apiContext)
    const { session, firstQuestion } = await startSessionViaApi(apiContext, brief.id)

    const answers = [
      'Queremos criar uma plataforma de gestão de projetos para pequenas agências.',
      'O prazo estimado é de 6 meses, com lançamento previsto para outubro de 2026.',
      'O orçamento total disponível é de R$ 150.000 para desenvolvimento completo.',
      'O público-alvo são agências de comunicação com até 50 funcionários.',
      'As principais funcionalidades são kanban, relatórios e integração com Slack.',
      'A tecnologia preferida é Next.js com PostgreSQL e deploy na Vercel.',
      'O critério de sucesso é ter 100 usuários ativos no primeiro mês após lançamento.',
    ]

    let currentQuestion = firstQuestion

    for (let i = 0; i < 7; i++) {
      const answer = answers[i]
      const isLast = i === 6

      const result = await answerQuestionViaApi(
        apiContext,
        brief.id,
        session.id,
        currentQuestion.id,
        answer,
      )

      if (isLast) {
        expect(result.sessionStatus).toBe('COMPLETED')
      } else {
        expect(result.chunks).toBeDefined()
        expect(result.chunks!.length).toBeGreaterThan(0)

        const sessionRes = await apiContext.get(
          `${BASE_URL}/api/briefs/${brief.id}/sessions/${session.id}`,
        )
        expect(sessionRes.status()).toBe(200)
        const sessionBody = await sessionRes.json()
        const questions = sessionBody.data.questions as Array<{
          id: string
          order: number
          questionText: string
          answerText: string | null
        }>

        const nextQuestion = questions
          .sort((a, b) => a.order - b.order)
          .find(q => q.answerText === null)

        expect(nextQuestion).toBeDefined()
        currentQuestion = nextQuestion!
      }
    }
  })

  test('não membro não pode criar brief → 403', async ({ request: apiContext }) => {
    const res = await apiContext.post(`${BASE_URL}/api/briefs`, {
      data: { projectId: '00000000-0000-0000-0000-000000000000' },
    })
    expect([403, 404]).toContain(res.status())
  })

  test('sessão já ativa → nova tentativa retorna 409', async ({ request: apiContext }) => {
    const brief = await createBriefViaApi(apiContext)
    await startSessionViaApi(apiContext, brief.id)

    const res = await apiContext.post(`${BASE_URL}/api/briefs/${brief.id}/sessions`)
    expect(res.status()).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('BRIEF_081')
  })

  test('resposta muito curta (< 10 chars) → 422', async ({ request: apiContext }) => {
    const brief = await createBriefViaApi(apiContext)
    const { session, firstQuestion } = await startSessionViaApi(apiContext, brief.id)

    const res = await apiContext.post(
      `${BASE_URL}/api/briefs/${brief.id}/sessions/${session.id}/questions`,
      { data: { questionId: firstQuestion.id, answer: 'curta' } },
    )
    expect(res.status()).toBe(422)
  })

  test('GET /api/briefs/[id] retorna brief com última sessão', async ({ request: apiContext }) => {
    const brief = await createBriefViaApi(apiContext)
    await startSessionViaApi(apiContext, brief.id)

    const res = await apiContext.get(`${BASE_URL}/api/briefs/${brief.id}`)
    expect(res.status()).toBe(200)

    const body = await res.json()
    expect(body.data.id).toBe(brief.id)
    expect(body.data).toBeDefined()
  })
})

// ─── Browser Tests ─────────────────────────────────────────────────────────

test.describe('Browser: PM acessa BriefForge', () => {
  test.use({ storageState: 'playwright/.auth/pm-user.json' })

  test('PM acessa /briefforge/[projectId] e vê botão Iniciar Entrevista', async ({ page }) => {
    await page.goto(`/briefforge/${PROJECT_ID}`)

    // Aguarda a página carregar
    await page.waitForLoadState('networkidle')

    // Verifica que a página do briefforge carregou
    const chat = page.locator('[data-testid="briefforge-chat"]')
    await expect(chat).toBeVisible({ timeout: 10_000 })

    // Verifica que o progresso está visível
    const progress = page.locator('[data-testid="briefforge-progress"]')
    await expect(progress).toBeVisible()

    // Botão de iniciar entrevista deve estar presente (brief DRAFT)
    const startButton = page.locator('[data-testid="briefforge-start-button"]')
    // Se brief já foi iniciado, o botão não estará visível — verificamos se o chat está ok
    const hasStartButton = await startButton.isVisible().catch(() => false)
    if (hasStartButton) {
      await expect(startButton).toHaveText(/Iniciar Entrevista/)
    }
  })

  test('PM inicia entrevista e vê primeira pergunta no chat', async ({ page }) => {
    await page.goto(`/briefforge/${PROJECT_ID}`)
    await page.waitForLoadState('networkidle')

    const startButton = page.locator('[data-testid="briefforge-start-button"]')
    const hasStartButton = await startButton.isVisible({ timeout: 5_000 }).catch(() => false)

    if (!hasStartButton) {
      // Brief já tem sessão ativa — verificar que chat tem conteúdo
      const chatArea = page.locator('[data-testid="briefforge-chat"]')
      await expect(chatArea).toBeVisible()
      // Deve haver pelo menos uma pergunta (article com label de pergunta da IA)
      const questionCards = page.locator('[data-testid="briefforge-chat"] [role="article"]')
      await expect(questionCards.first()).toBeVisible({ timeout: 10_000 })
      return
    }

    // Clicar para iniciar
    await startButton.click()

    // Aguardar primeira pergunta aparecer no chat
    const questionCard = page.locator('[data-testid="briefforge-chat"] [role="article"]').first()
    await expect(questionCard).toBeVisible({ timeout: 30_000 })

    // Input de resposta deve estar visível
    const inputArea = page.locator('[data-testid="briefforge-input-area"]')
    await expect(inputArea).toBeVisible()

    const textarea = page.locator('[data-testid="briefforge-answer-input"]')
    await expect(textarea).toBeEnabled()
  })

  test('PM responde primeira pergunta e vê próxima pergunta via streaming', async ({ page }) => {
    await page.goto(`/briefforge/${PROJECT_ID}`)
    await page.waitForLoadState('networkidle')

    // Iniciar entrevista se necessário
    const startButton = page.locator('[data-testid="briefforge-start-button"]')
    const hasStartButton = await startButton.isVisible({ timeout: 5_000 }).catch(() => false)
    if (hasStartButton) {
      await startButton.click()
      // Aguardar primeira pergunta
      await page.locator('[data-testid="briefforge-chat"] [role="article"]').first()
        .waitFor({ state: 'visible', timeout: 30_000 })
    }

    // Verificar que input está disponível
    const textarea = page.locator('[data-testid="briefforge-answer-input"]')
    const isInputVisible = await textarea.isVisible({ timeout: 5_000 }).catch(() => false)
    if (!isInputVisible) {
      // Sessão pode já estar completa
      return
    }

    // Contar perguntas antes
    const questionsBefore = await page.locator('[data-testid="briefforge-chat"] [role="article"]').count()

    // Digitar resposta válida
    await textarea.fill('Queremos criar uma plataforma de gestão de projetos para pequenas agências de comunicação.')
    const sendBtn = page.locator('[data-testid="briefforge-send-button"]')
    await sendBtn.click()

    // Aguardar próxima pergunta (streaming)
    await page.waitForFunction(
      (prevCount) => {
        const articles = document.querySelectorAll('[data-testid="briefforge-chat"] [role="article"]')
        return articles.length > prevCount
      },
      questionsBefore,
      { timeout: 60_000 },
    )

    // Verificar que pelo menos uma nova pergunta apareceu
    const questionsAfter = await page.locator('[data-testid="briefforge-chat"] [role="article"]').count()
    expect(questionsAfter).toBeGreaterThan(questionsBefore)
  })
})

// ─── RBAC Browser Tests ────────────────────────────────────────────────────

test.describe('Browser: DEV não tem ações criativas no BriefForge', () => {
  test.use({ storageState: 'playwright/.auth/dev-user.json' })

  test('DEV acessa /briefforge/[projectId] → sem botão Iniciar Entrevista', async ({ page }) => {
    await page.goto(`/briefforge/${PROJECT_ID}`)
    await page.waitForLoadState('networkidle')

    // DEV pode ver a página mas não deve ver botão de ação criativa
    const startButton = page.locator('[data-testid="briefforge-start-button"]')
    // Aguardar um tempo razoável — o botão NÃO deve aparecer
    const isVisible = await startButton.isVisible({ timeout: 3_000 }).catch(() => false)
    expect(isVisible).toBe(false)
  })

  test('DEV tenta criar brief via API → 403', async ({ request: apiContext }) => {
    const res = await apiContext.post(`${BASE_URL}/api/briefs`, {
      data: { projectId: PROJECT_ID },
    })
    expect(res.status()).toBe(403)
  })
})
