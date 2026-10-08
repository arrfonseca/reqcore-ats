import { test as base, type Page } from '@playwright/test'

/**
 * Shared test fixtures for Reqcore E2E tests.
 *
 * Public registration is disabled. Tests sign in with an account that
 * already exists (seeded demo user by default).
 */

export interface TestAccount {
  name: string
  email: string
  password: string
  orgName: string
  orgSlug: string
}

function existingTestAccount(): TestAccount {
  return {
    name: process.env.E2E_TEST_NAME || 'Demo User',
    email: process.env.E2E_TEST_EMAIL || 'demo@reqcore.com',
    password: process.env.E2E_TEST_PASSWORD || 'demo1234',
    orgName: process.env.E2E_ORG_NAME || 'Reqcore Demo',
    orgSlug: process.env.E2E_ORG_SLUG || 'reqcore-demo',
  }
}

type Fixtures = {
  testAccount: TestAccount
  authenticatedPage: Page
}

export const test = base.extend<Fixtures>({
  testAccount: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      await use(existingTestAccount())
    },
    { scope: 'test' },
  ],

  authenticatedPage: async ({ page, testAccount }, use) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByLabel('Email').fill(testAccount.email)
    await page.getByLabel('Senha').fill(testAccount.password)

    await Promise.all([
      page.waitForResponse(
        resp => resp.url().includes('/api/auth/sign-in') && resp.status() === 200,
        { timeout: 30_000 },
      ),
      page.getByRole('button', { name: 'Entrar' }).click(),
    ])

    await page.waitForURL(
      url => url.pathname.includes('/admin') || url.pathname.includes('/onboarding/'),
      { waitUntil: 'commit', timeout: 30_000 },
    )

    if (page.url().includes('/onboarding/')) {
      await page.getByLabel('Organization name').waitFor({ state: 'visible', timeout: 30_000 })
      await page.getByLabel('Organization name').fill(testAccount.orgName)
      await page.getByRole('button', { name: 'Create organization' }).click()
      await page.waitForURL('**/admin**', { waitUntil: 'commit' })
    }

    const slugMatch = new URL(page.url()).pathname.match(/\/([^/]+)\/admin/)
    if (slugMatch?.[1]) testAccount.orgSlug = slugMatch[1]

    await use(page)
  },
})

export { expect } from '@playwright/test'
