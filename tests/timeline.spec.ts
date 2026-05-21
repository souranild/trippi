import { test, expect } from '@playwright/test'

test.describe('Trippi App Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Seed user profile
      window.localStorage.setItem(
        'userProfile',
        JSON.stringify({
          name: 'E2E Explorer',
          avatar: '🧑‍🚀',
          skinTone: 'medium'
        })
      )

      // Seed mock trips (current, upcoming, and past relative to today 2026-05-21)
      const mockTrips = [
        {
          id: '101',
          title: 'Current Paris Voyage',
          startDate: '2026-05-20',
          endDate: '2026-05-25',
          description: 'A brief escape to the City of Light',
          emoji: '🗼',
          places: []
        },
        {
          id: '102',
          title: 'Upcoming Tokyo Voyage',
          startDate: '2026-06-01',
          endDate: '2026-06-05',
          description: 'Exploring neon streets and sushi spots',
          emoji: '🗻',
          places: []
        },
        {
          id: '103',
          title: 'Past Rome Voyage',
          startDate: '2026-04-01',
          endDate: '2026-04-05',
          description: 'A deep dive into historical colosseums',
          emoji: '🏛️',
          places: []
        }
      ]
      window.localStorage.setItem('trippi-trips', JSON.stringify(mockTrips))
    })
  })

  test('should load the main page with animations and profile', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Check that the page loads
    await expect(page).toHaveTitle(/Trippi/)

    // Check for main elements
    await expect(page.getByText('Current Adventure', { exact: true })).toBeVisible()
    await expect(page.getByText('Upcoming Adventures', { exact: true })).toBeVisible()
    await expect(page.getByText('Past Adventures', { exact: true })).toBeVisible()

    // Verify individual seeded trip titles are present
    await expect(page.getByRole('heading', { name: 'Current Paris Voyage' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Upcoming Tokyo Voyage' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Past Rome Voyage' })).toBeVisible()

    // Check for profile section in menu drawer
    await page.getByRole('button', { name: 'Toggle menu' }).click()
    await expect(page.getByText('Edit Profile', { exact: true })).toBeVisible()
    await expect(page.getByText('Settings', { exact: true })).toBeVisible()
  })

  test('should open profile stats and editor modal', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Open account menu
    await page.getByRole('button', { name: 'Toggle menu' }).click()

    // Click on Edit Profile in drawer
    await page.getByRole('button', { name: 'person Edit Profile' }).click()

    // Check that stats modal opens showing explorer details
    await expect(page.getByRole('heading', { name: 'E2E Explorer', exact: true, level: 2 })).toBeVisible()
    await expect(page.getByText('World Traveler')).toBeVisible()

    // Go to edit profile view
    await page.getByRole('button', { name: 'edit Edit Profile' }).click()

    // Surprise me button should be visible in editor
    await expect(page.getByRole('button', { name: 'Surprise Me' })).toBeVisible()

    // Click random button
    await page.getByRole('button', { name: 'Surprise Me' }).click()

    // Close/Cancel editor step
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Click Done to close the stats modal
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByText('World Traveler')).not.toBeVisible()
  })

  test('should navigate to adventures page', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Open account menu
    await page.getByRole('button', { name: 'Toggle menu' }).click()

    // Click on "Adventures" link in drawer
    await page.getByRole('link', { name: 'Adventures' }).click()

    // Should navigate to adventures page
    await expect(page).toHaveURL(/\/adventures/)
    await expect(page.getByRole('heading', { name: 'Adventures' })).toBeVisible()
  })

  test('should open create new trip page', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Click on "New Trip" link on dashboard
    await page.getByRole('link', { name: 'New Trip' }).click()

    // Should navigate to new trip page
    await expect(page).toHaveURL(/\/trip\/new/)
    await expect(page.getByRole('heading', { name: 'Create New Trip' })).toBeVisible()

    // Click emoji picker
    await page.getByTitle('Change emoji').click()
    await expect(page.getByRole('heading', { name: 'Select Emoji' })).toBeVisible()

    // Close emoji picker
    await page.getByRole('button', { name: 'close', exact: true }).click()
  })
})