import { test, expect } from '@playwright/test'

test.describe('Trippi App Features', () => {
  test('should load the main page with animations and profile', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Check that the page loads
    await expect(page).toHaveTitle(/Trippi/)

    // Check for main elements
    await expect(page.getByText('Your Adventure')).toBeVisible()
    await expect(page.getByText('Adventures')).toBeVisible()

    // Check for profile section in account menu
    await page.getByRole('button', { name: 'menu' }).click()
    await expect(page.getByText('Account')).toBeVisible()
    await expect(page.getByText('Profile')).toBeVisible()

    // Check for trip cards
    const tripCards = page.locator('.trip-card')
    // May be empty, but the section should exist
    await expect(page.getByText('Your Trips')).toBeVisible()
  })

  test('should open character picker modal', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Open account menu
    await page.getByRole('button', { name: 'menu' }).click()

    // Click on the profile avatar
    await page.locator('.profile-avatar').click()

    // Check that modal opens
    await expect(page.getByText('Choose Your Character')).toBeVisible()

    // Check for character grid
    const characterButtons = page.locator('button').filter({ hasText: /🧑‍🚀|👨‍🚀|👩‍🚀/ })
    await expect(characterButtons.first()).toBeVisible()

    // Click random button
    await page.getByRole('button', { name: 'Random' }).click()

    // Modal should still be open
    await expect(page.getByText('Choose Your Character')).toBeVisible()

    // Close modal
    await page.getByRole('button', { name: 'close' }).click()
    await expect(page.getByText('Choose Your Character')).not.toBeVisible()
  })

  test('should navigate to trips page', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Click on "View all" link
    await page.getByRole('link', { name: 'View all' }).click()

    // Should navigate to trips page
    await expect(page).toHaveURL(/\/trips/)
    await expect(page.getByText('Your Trips')).toBeVisible()
  })

  test('should open create new trip page', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Click on "Create Trip" link
    await page.getByRole('link', { name: 'Create Trip' }).click()

    // Should navigate to new trip page
    await expect(page).toHaveURL(/\/trip\/new/)
    await expect(page.getByText('Create New Trip')).toBeVisible()

    // Check for emoji picker
    await expect(page.getByText('Choose an emoji')).toBeVisible()

    // Click emoji picker
    await page.getByText('Choose an emoji').click()
    await expect(page.getByText('Pick an emoji for your trip')).toBeVisible()

    // Close emoji picker
    await page.getByRole('button', { name: 'close' }).click()
  })
})