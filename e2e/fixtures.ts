import { test as base, type Page } from '@playwright/test'

type AuthFixtures = {
  socioPage: Page
  pmPage: Page
  devPage: Page
  clientePage: Page
}

export const test = base.extend<AuthFixtures>({
  socioPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: 'e2e/.auth/socio.json' })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
  pmPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: 'e2e/.auth/pm.json' })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
  devPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: 'e2e/.auth/dev.json' })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
  clientePage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: 'e2e/.auth/cliente.json' })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
})

export { expect } from '@playwright/test'
