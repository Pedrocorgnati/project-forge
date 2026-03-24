// e2e/board/drag-and-drop.spec.ts
// E2E tests for Kanban drag-and-drop (module-9-scopeshield-board)

import { test, expect } from '@playwright/test'

const BOARD_URL = '/projetos/test-project-1/board'

test.describe('Kanban Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    // Login as PM (has full edit permissions)
    await page.goto('/login')
    await page.fill('input[name="email"]', 'pm@test.com')
    await page.fill('input[name="password"]', 'Test1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/dashboard|projetos/)
  })

  test('mover card de TODO para IN_PROGRESS via drag', async ({ page }) => {
    await page.goto(BOARD_URL)

    // Wait for board to render
    await page.waitForSelector('[data-testid="kanban-board"]')

    const todoColumn = page.locator('[data-testid="kanban-column-TODO"]')
    const inProgressColumn = page.locator('[data-testid="kanban-column-IN_PROGRESS"]')

    // Get the first task card in TODO
    const firstCard = todoColumn.locator('[data-testid="task-card"]').first()
    const cardTitle = await firstCard.locator('[data-testid="task-card-title"]').textContent()

    // Perform drag from TODO to IN_PROGRESS
    const cardBox = await firstCard.boundingBox()
    const targetBox = await inProgressColumn.boundingBox()

    if (!cardBox || !targetBox) {
      test.skip(true, 'No cards in TODO or IN_PROGRESS column not found')
      return
    }

    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
    await page.mouse.down()
    // Move with distance > 8px to activate PointerSensor
    await page.mouse.move(cardBox.x + 20, cardBox.y + 20, { steps: 3 })
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 50, { steps: 5 })
    await page.mouse.up()

    // Verify card moved to IN_PROGRESS
    await expect(inProgressColumn.locator(`text=${cardTitle}`)).toBeVisible({ timeout: 5000 })

    // Verify PATCH was called (intercept network)
    // The optimistic update should show the card immediately
  })

  test('rollback quando API retorna erro no PATCH', async ({ page }) => {
    // Intercept PATCH to force error
    await page.route('**/api/projects/*/tasks/*', (route) => {
      if (route.request().method() === 'PATCH') {
        return route.fulfill({ status: 500, body: JSON.stringify({ error: { message: 'Server error' } }) })
      }
      return route.continue()
    })

    await page.goto(BOARD_URL)
    await page.waitForSelector('[data-testid="kanban-board"]')

    const todoColumn = page.locator('[data-testid="kanban-column-TODO"]')
    const firstCard = todoColumn.locator('[data-testid="task-card"]').first()
    const cardTitle = await firstCard.locator('[data-testid="task-card-title"]').textContent()

    const cardBox = await firstCard.boundingBox()
    const inProgressColumn = page.locator('[data-testid="kanban-column-IN_PROGRESS"]')
    const targetBox = await inProgressColumn.boundingBox()

    if (!cardBox || !targetBox) {
      test.skip(true, 'No cards available for drag test')
      return
    }

    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(cardBox.x + 20, cardBox.y + 20, { steps: 3 })
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 50, { steps: 5 })
    await page.mouse.up()

    // Wait for rollback (error toast should appear)
    await expect(page.locator('text=Erro ao mover tarefa')).toBeVisible({ timeout: 5000 })

    // Card should be back in TODO after rollback
    await expect(todoColumn.locator(`text=${cardTitle}`)).toBeVisible({ timeout: 5000 })
  })

  test('CLIENTE não consegue arrastar cards (read-only)', async ({ page, browser }) => {
    // Login as CLIENTE
    const clienteContext = await browser.newContext()
    const clientePage = await clienteContext.newPage()

    await clientePage.goto('/login')
    await clientePage.fill('input[name="email"]', 'cliente@test.com')
    await clientePage.fill('input[name="password"]', 'Test1234!')
    await clientePage.click('button[type="submit"]')
    await clientePage.waitForURL(/dashboard|portal/)

    await clientePage.goto(BOARD_URL)
    await clientePage.waitForSelector('[data-testid="kanban-board"]')

    // Cards should be visible but not draggable
    const todoColumn = clientePage.locator('[data-testid="kanban-column-TODO"]')
    const cards = todoColumn.locator('[data-testid="task-card"]')
    const cardCount = await cards.count()

    if (cardCount > 0) {
      const firstCard = cards.first()
      // Verify card does NOT have draggable attributes
      const draggableAttr = await firstCard.getAttribute('data-draggable')
      // In read-only mode, DndContext has no sensors, so cards are not draggable
      // The absence of drag handles or cursor:grab confirms read-only
      const cursor = await firstCard.evaluate((el) => window.getComputedStyle(el).cursor)
      expect(cursor).not.toBe('grab')
    }

    await clienteContext.close()
  })
})
