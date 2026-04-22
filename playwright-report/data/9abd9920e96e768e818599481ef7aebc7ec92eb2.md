# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: new-trip-flow.spec.ts >> New trip flow >> create trip saves to storage and navigates to the same trip id
- Location: tests/new-trip-flow.spec.ts:4:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Create New Trip' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Create New Trip' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - heading "Welcome to Trippi" [level=1] [ref=e6]
      - paragraph [ref=e7]: Let's set up your profile for the ultimate travel planning experience
    - generic [ref=e8]:
      - generic [ref=e9]: ✈️
      - heading "Ready for adventure?" [level=2] [ref=e10]
      - paragraph [ref=e11]:
        - text: First, let's get to know you!
        - text: We'll ask for your name and help you customize your experience.
      - button "Let's Begin" [ref=e12]
  - button "Open Next.js Dev Tools" [ref=e18] [cursor=pointer]:
    - img [ref=e19]
  - alert [ref=e22]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test.describe('New trip flow', () => {
  4  |   test('create trip saves to storage and navigates to the same trip id', async ({ page }) => {
  5  |     await page.goto('/trip/new')
> 6  |     await expect(page.getByRole('heading', { name: 'Create New Trip' })).toBeVisible()
     |                                                                          ^ Error: expect(locator).toBeVisible() failed
  7  | 
  8  |     await page.getByPlaceholder('Trip name...').fill('E2E Test Adventure')
  9  | 
  10 |     // Emoji picker trigger shows mood icon until an emoji is chosen
  11 |     await page.locator('form').getByRole('button', { name: 'mood' }).click()
  12 |     await expect(page.getByRole('heading', { name: 'Choose Trip Emoji' })).toBeVisible()
  13 |     await page.getByRole('button', { name: '✈️', exact: true }).click()
  14 | 
  15 |     // Fill start date
  16 |     await page.getByLabel('Start Date').fill('2026-04-15')
  17 | 
  18 |     await page.getByRole('button', { name: 'Create Trip' }).click()
  19 | 
  20 |     await expect(page).toHaveURL(/\/trip\/\d+/)
  21 |     const url = page.url()
  22 |     const id = url.match(/\/trip\/(\d+)/)?.[1]
  23 |     expect(id, 'trip id in URL').toBeTruthy()
  24 | 
  25 |     const storedId = await page.evaluate(() => {
  26 |       const raw = localStorage.getItem('trippi-trips')
  27 |       if (!raw) return null
  28 |       const trips = JSON.parse(raw) as { id: string; title: string }[]
  29 |       const t = trips.find((x) => x.title === 'E2E Test Adventure')
  30 |       return t?.id ?? null
  31 |     })
  32 |     expect(storedId, 'saved trip id in localStorage').toBe(id)
  33 | 
  34 |     await expect(page.getByRole('heading', { name: 'E2E Test Adventure' })).toBeVisible({
  35 |       timeout: 10_000,
  36 |     })
  37 |   })
  38 | })
  39 | 
```