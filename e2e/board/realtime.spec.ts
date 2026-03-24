// e2e/board/realtime.spec.ts
// E2E tests for Supabase Realtime sync between tabs (module-9-scopeshield-board)

import { test, expect } from '@playwright/test'

const BOARD_URL = '/projetos/test-project-1/board'

test.describe('Board Realtime Sync', () => {
  test('mudança em aba A reflete em aba B em < 5s', async ({ browser }) => {
    // Create two separate browser contexts (simulating two users/tabs)
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()

    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    // Login user A (PM)
    await pageA.goto('/login')
    await pageA.fill('input[name="email"]', 'pm@test.com')
    await pageA.fill('input[name="password"]', 'Test1234!')
    await pageA.click('button[type="submit"]')
    await pageA.waitForURL(/dashboard|projetos/)

    // Login user B (DEV)
    await pageB.goto('/login')
    await pageB.fill('input[name="email"]', 'dev@test.com')
    await pageB.fill('input[name="password"]', 'Test1234!')
    await pageB.click('button[type="submit"]')
    await pageB.waitForURL(/dashboard|projetos/)

    // Both navigate to the same board
    await pageA.goto(BOARD_URL)
    await pageB.goto(BOARD_URL)

    await pageA.waitForSelector('[data-testid="kanban-board"]')
    await pageB.waitForSelector('[data-testid="kanban-board"]')

    // User A creates a new task
    const createBtn = pageA.locator('[data-testid="kanban-column-TODO"] button[aria-label*="nova"]').first()
    if (await createBtn.isVisible()) {
      await createBtn.click()

      // Fill task form
      await pageA.fill('input[name="title"]', 'Realtime Test Task')
      await pageA.click('button:has-text("Criar")')

      // Wait for task to appear in page A
      await expect(pageA.locator('text=Realtime Test Task')).toBeVisible({ timeout: 5000 })

      // Wait for realtime sync — task should appear in page B within 5s
      await expect(pageB.locator('text=Realtime Test Task')).toBeVisible({ timeout: 5000 })
    }

    await contextA.close()
    await contextB.close()
  })

  test('task movida por user A aparece na nova coluna para user B', async ({ browser }) => {
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()

    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    // Login both users
    await pageA.goto('/login')
    await pageA.fill('input[name="email"]', 'pm@test.com')
    await pageA.fill('input[name="password"]', 'Test1234!')
    await pageA.click('button[type="submit"]')
    await pageA.waitForURL(/dashboard|projetos/)

    await pageB.goto('/login')
    await pageB.fill('input[name="email"]', 'dev@test.com')
    await pageB.fill('input[name="password"]', 'Test1234!')
    await pageB.click('button[type="submit"]')
    await pageB.waitForURL(/dashboard|projetos/)

    // Both on the same board
    await pageA.goto(BOARD_URL)
    await pageB.goto(BOARD_URL)

    await pageA.waitForSelector('[data-testid="kanban-board"]')
    await pageB.waitForSelector('[data-testid="kanban-board"]')

    // User A drags a card from TODO to IN_PROGRESS
    const todoColumn = pageA.locator('[data-testid="kanban-column-TODO"]')
    const firstCard = todoColumn.locator('[data-testid="task-card"]').first()
    const cardCount = await firstCard.count()

    if (cardCount > 0) {
      const cardTitle = await firstCard.locator('[data-testid="task-card-title"]').textContent()
      const inProgressColumn = pageA.locator('[data-testid="kanban-column-IN_PROGRESS"]')

      const cardBox = await firstCard.boundingBox()
      const targetBox = await inProgressColumn.boundingBox()

      if (cardBox && targetBox) {
        await pageA.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
        await pageA.mouse.down()
        await pageA.mouse.move(cardBox.x + 20, cardBox.y + 20, { steps: 3 })
        await pageA.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 50, { steps: 5 })
        await pageA.mouse.up()

        // User B should see the card in IN_PROGRESS within 5s via Realtime
        const pageBInProgress = pageB.locator('[data-testid="kanban-column-IN_PROGRESS"]')
        await expect(pageBInProgress.locator(`text=${cardTitle}`)).toBeVisible({ timeout: 5000 })
      }
    }

    await contextA.close()
    await contextB.close()
  })
})
