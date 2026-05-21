import { test, expect } from '@playwright/test'

test.describe('New trip flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'userProfile',
        JSON.stringify({
          name: 'E2E Explorer',
          avatar: '🧑‍🚀',
          skinTone: 'medium'
        })
      )
    })
  })

  test('create trip saves to storage and navigates to the same trip id', async ({ page }) => {
    await page.goto('/trip/new')
    await expect(page.getByRole('heading', { name: 'Create New Trip' })).toBeVisible()

    await page.getByPlaceholder('Where are we going?').fill('E2E Test Adventure')

    // Emoji picker trigger shows the default or assigned emoji with "Change emoji" title
    await page.getByTitle('Change emoji').click()
    await expect(page.getByRole('heading', { name: 'Select Emoji' })).toBeVisible()
    await page.getByRole('button', { name: '😊', exact: true }).click()

    // Select start date using the custom DatePicker
    await page.getByRole('button', { name: 'When are you going?' }).click()
    await page.getByRole('button', { name: 'Today', exact: true }).click()

    await page.getByRole('button', { name: 'Create Trip' }).click()

    await expect(page).toHaveURL(/\/trip\?id=\d+/)
    const url = page.url()
    const id = url.match(/id=(\d+)/)?.[1]
    expect(id, 'trip id in URL').toBeTruthy()

    const storedId = await page.evaluate(async () => {
      // 1. Try IndexedDB
      try {
        const dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
          const req = indexedDB.open('trippi-db', 1)
          req.onerror = () => reject(req.error)
          req.onsuccess = () => resolve(req.result)
        })
        const db = await dbPromise
        const transaction = db.transaction('trips', 'readonly')
        const store = transaction.objectStore('trips')
        const getReqPromise = new Promise<any>((resolve, reject) => {
          const getReq = store.get('trippi-trips')
          getReq.onerror = () => reject(getReq.error)
          getReq.onsuccess = () => resolve(getReq.result)
        })
        const trips = await getReqPromise
        if (Array.isArray(trips)) {
          const t = trips.find((x) => x.title === 'E2E Test Adventure')
          if (t) return t.id
        }
      } catch (e) {
        console.error('IndexedDB check failed:', e)
      }

      // 2. Try localStorage Backup meta
      try {
        const raw = window.localStorage.getItem('trippi-trips-meta')
        if (raw) {
          const trips = JSON.parse(raw)
          if (Array.isArray(trips)) {
            const t = trips.find((x) => x.title === 'E2E Test Adventure')
            if (t) return t.id
          }
        }
      } catch (e) {
        console.error('LocalStorage check failed:', e)
      }

      // 3. Try fallback localStorage raw
      try {
        const raw = window.localStorage.getItem('trippi-trips')
        if (raw) {
          const trips = JSON.parse(raw)
          if (Array.isArray(trips)) {
            const t = trips.find((x) => x.title === 'E2E Test Adventure')
            if (t) return t.id
          }
        }
      } catch (e) {
        console.error('LocalStorage raw check failed:', e)
      }

      return null
    })
    expect(storedId, 'saved trip id in storage').toBe(id)

    await expect(page.getByRole('heading', { name: 'E2E Test Adventure' })).toBeVisible({
      timeout: 10_000,
    })
  })
})
