# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: timeline.spec.ts >> Trippi App Features >> should navigate to trips page
- Location: tests/timeline.spec.ts:52:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('link', { name: 'View all' })

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
  3  | test.describe('Trippi App Features', () => {
  4  |   test('should load the main page with animations and profile', async ({ page }) => {
  5  |     await page.goto('http://localhost:3000')
  6  | 
  7  |     // Check that the page loads
  8  |     await expect(page).toHaveTitle(/Trippi/)
  9  | 
  10 |     // Check for main elements
  11 |     await expect(page.getByText('Your Adventure')).toBeVisible()
  12 |     await expect(page.getByText('Adventures')).toBeVisible()
  13 | 
  14 |     // Check for profile section in account menu
  15 |     await page.getByRole('button', { name: 'menu' }).click()
  16 |     await expect(page.getByText('Account')).toBeVisible()
  17 |     await expect(page.getByText('Profile')).toBeVisible()
  18 | 
  19 |     // Check for trip cards
  20 |     const tripCards = page.locator('.trip-card')
  21 |     // May be empty, but the section should exist
  22 |     await expect(page.getByText('Your Trips')).toBeVisible()
  23 |   })
  24 | 
  25 |   test('should open character picker modal', async ({ page }) => {
  26 |     await page.goto('http://localhost:3000')
  27 | 
  28 |     // Open account menu
  29 |     await page.getByRole('button', { name: 'menu' }).click()
  30 | 
  31 |     // Click on the profile avatar
  32 |     await page.locator('.profile-avatar').click()
  33 | 
  34 |     // Check that modal opens
  35 |     await expect(page.getByText('Choose Your Character')).toBeVisible()
  36 | 
  37 |     // Check for character grid
  38 |     const characterButtons = page.locator('button').filter({ hasText: /🧑‍🚀|👨‍🚀|👩‍🚀/ })
  39 |     await expect(characterButtons.first()).toBeVisible()
  40 | 
  41 |     // Click random button
  42 |     await page.getByRole('button', { name: 'Random' }).click()
  43 | 
  44 |     // Modal should still be open
  45 |     await expect(page.getByText('Choose Your Character')).toBeVisible()
  46 | 
  47 |     // Close modal
  48 |     await page.getByRole('button', { name: 'close' }).click()
  49 |     await expect(page.getByText('Choose Your Character')).not.toBeVisible()
  50 |   })
  51 | 
  52 |   test('should navigate to trips page', async ({ page }) => {
  53 |     await page.goto('http://localhost:3000')
  54 | 
  55 |     // Click on "View all" link
> 56 |     await page.getByRole('link', { name: 'View all' }).click()
     |                                                        ^ Error: locator.click: Test timeout of 30000ms exceeded.
  57 | 
  58 |     // Should navigate to trips page
  59 |     await expect(page).toHaveURL(/\/trips/)
  60 |     await expect(page.getByText('Your Trips')).toBeVisible()
  61 |   })
  62 | 
  63 |   test('should open create new trip page', async ({ page }) => {
  64 |     await page.goto('http://localhost:3000')
  65 | 
  66 |     // Click on "Create Trip" link
  67 |     await page.getByRole('link', { name: 'Create Trip' }).click()
  68 | 
  69 |     // Should navigate to new trip page
  70 |     await expect(page).toHaveURL(/\/trip\/new/)
  71 |     await expect(page.getByText('Create New Trip')).toBeVisible()
  72 | 
  73 |     // Check for emoji picker
  74 |     await expect(page.getByText('Choose an emoji')).toBeVisible()
  75 | 
  76 |     // Click emoji picker
  77 |     await page.getByText('Choose an emoji').click()
  78 |     await expect(page.getByText('Pick an emoji for your trip')).toBeVisible()
  79 | 
  80 |     // Close emoji picker
  81 |     await page.getByRole('button', { name: 'close' }).click()
  82 |   })
  83 | })
```