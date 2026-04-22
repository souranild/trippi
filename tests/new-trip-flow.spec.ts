import { test, expect } from '@playwright/test'

test.describe('New trip flow', () => {
  test('create trip saves to storage and navigates to the same trip id', async ({ page }) => {
    await page.goto('/trip/new')
    await expect(page.getByRole('heading', { name: 'Create New Trip' })).toBeVisible()

    await page.getByPlaceholder('Trip name...').fill('E2E Test Adventure')

    // Emoji picker trigger shows mood icon until an emoji is chosen
    await page.locator('form').getByRole('button', { name: 'mood' }).click()
    await expect(page.getByRole('heading', { name: 'Choose Trip Emoji' })).toBeVisible()
    await page.getByRole('button', { name: '✈️', exact: true }).click()

    // Fill start date
    await page.getByLabel('Start Date').fill('2026-04-15')

    await page.getByRole('button', { name: 'Create Trip' }).click()

    await expect(page).toHaveURL(/\/trip\/\d+/)
    const url = page.url()
    const id = url.match(/\/trip\/(\d+)/)?.[1]
    expect(id, 'trip id in URL').toBeTruthy()

    const storedId = await page.evaluate(() => {
      const raw = localStorage.getItem('trippi-trips')
      if (!raw) return null
      const trips = JSON.parse(raw) as { id: string; title: string }[]
      const t = trips.find((x) => x.title === 'E2E Test Adventure')
      return t?.id ?? null
    })
    expect(storedId, 'saved trip id in localStorage').toBe(id)

    await expect(page.getByRole('heading', { name: 'E2E Test Adventure' })).toBeVisible({
      timeout: 10_000,
    })
  })
})
