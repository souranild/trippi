import { test, expect } from '@playwright/test'

test.describe('Document Upload Flow', () => {
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

      // Seed a mock trip with two places and a connecting transport leg
      const mockTrips = [
        {
          id: '101',
          title: 'Current Paris Voyage',
          startDate: '2026-05-20',
          endDate: '2026-05-25',
          description: 'A brief escape to the City of Light',
          emoji: '🗼',
          places: [
            {
              id: 'place-1',
              name: 'Eiffel Tower',
              location: 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France',
              country: 'France',
              lat: 48.8584,
              lng: 2.2945,
              emoji: '🗼',
              day: 1,
              notes: [],
              accommodations: [],
              events: [],
              documents: [],
              links: [],
              transport: [
                {
                  id: 'leg-1',
                  from: 'place-1',
                  to: 'place-2',
                  type: 'train',
                  carrier: 'Eurostar',
                  number: 'ES9013',
                  departure: '12:00',
                  arrival: '14:30',
                  departureDay: 1,
                  arrivalDay: 1,
                  documents: [],
                  notes: []
                }
              ]
            },
            {
              id: 'place-2',
              name: 'Louvre Museum',
              location: 'Rue de Rivoli, 75001 Paris, France',
              country: 'France',
              lat: 48.8606,
              lng: 2.3376,
              emoji: '🏛️',
              day: 1,
              notes: [],
              accommodations: [],
              events: [],
              documents: [],
              links: [],
              transport: []
            }
          ]
        }
      ]
      window.localStorage.setItem('trippi-trips', JSON.stringify(mockTrips))
    })
  })

  test('should successfully add and upload a document to a place', async ({ page }) => {
    // 1. Go to the Paris trip page
    await page.goto('/trip?id=101')

    // Verify trip loads
    await expect(page.getByRole('heading', { name: 'Current Paris Voyage' })).toBeVisible()

    // Verify Eiffel Tower place is visible
    const placeCard = page.getByRole('heading', { name: 'Eiffel Tower' })
    await expect(placeCard).toBeVisible()

    // 2. Click the place card to open PlaceDetailModal
    await placeCard.click()

    // Verify the modal is open
    await expect(page.getByRole('heading', { name: 'Eiffel Tower', level: 2 })).toBeVisible()

    // 3. Click "Edit Details" button to enter edit mode in PlaceDetailModal
    await page.getByTitle('Edit Details').click()

    // 4. Click the "Add File" button in the Documents section
    await page.getByTitle('Add File').click()

    // 5. Verify AttachmentDetailModal is open
    await expect(page.getByText('File Attachment', { exact: true })).toBeVisible()

    // Fill in the document name using a precise adjacent sibling locator
    const docNameInput = page.locator('label:has-text("Document Name") + input')
    await docNameInput.fill('E2E Test Ticket')

    // Fill in optional URL using a precise adjacent sibling locator
    const docUrlInput = page.locator('label:has-text("URL (Optional)") + input')
    await docUrlInput.fill('https://example.com/ticket')

    // 6. Upload a mock document file using setInputFiles
    const fileInput = page.locator('input[type="file"]')
    const fileContent = 'dummy pdf file buffer content'
    await fileInput.setInputFiles({
      name: 'ticket.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(fileContent)
    })

    // Verify the file was attached in the UI (e.g. text "File attached" should show)
    await expect(page.getByText('File attached')).toBeVisible()

    // 7. Save changes on the AttachmentDetailModal
    await page.getByRole('button', { name: 'save Save Changes' }).click()

    // 8. Verify we are back on PlaceDetailModal and the new document is listed
    await expect(page.getByRole('paragraph').filter({ hasText: 'E2E Test Ticket' })).toBeVisible()

    // 9. Click Save Changes on the PlaceDetailModal to commit to storage
    await page.getByRole('button', { name: 'check_circle Save Changes' }).click()

    // Verify PlaceDetailModal is closed (the heading 'Eiffel Tower' as level 2 should no longer be visible)
    await expect(page.getByRole('heading', { name: 'Eiffel Tower', level: 2 })).not.toBeVisible()

    // 10. Query IndexedDB or localStorage to verify the document's Base64 content is correctly persisted
    const storedTripData = await page.evaluate(async () => {
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
          const t = trips.find((x) => x.id === '101')
          if (t) return t
        }
      } catch (e) {
        console.error('IndexedDB check failed:', e)
      }

      // 2. Try localStorage raw
      try {
        const raw = window.localStorage.getItem('trippi-trips')
        if (raw) {
          const trips = JSON.parse(raw)
          if (Array.isArray(trips)) {
            const t = trips.find((x) => x.id === '101')
            if (t) return t
          }
        }
      } catch (e) {
        console.error('LocalStorage raw check failed:', e)
      }

      return null
    })

    expect(storedTripData).toBeTruthy()
    const place = storedTripData.places?.find((p: any) => p.id === 'place-1')
    expect(place).toBeTruthy()
    expect(place.documents).toBeTruthy()
    expect(place.documents.length).toBe(1)
    
    const doc = place.documents[0]
    expect(doc.name).toBe('E2E Test Ticket')
    expect(doc.url).toBe('https://example.com/ticket')
    expect(doc.mimeType).toBe('application/pdf')
    expect(doc.file).toContain('data:application/pdf;base64,')
  })

  test('should successfully add a Google Sheet link, auto-name it, and render type-specific styling and previews', async ({ page }) => {
    // 1. Go to the Paris trip page
    await page.goto('/trip?id=101')

    // Verify trip loads
    await expect(page.getByRole('heading', { name: 'Current Paris Voyage' })).toBeVisible()

    // 2. Click the Eiffel Tower card to open PlaceDetailModal
    const placeCard = page.getByRole('heading', { name: 'Eiffel Tower' })
    await placeCard.click()

    // 3. Click "Edit Details" button to enter edit mode in PlaceDetailModal
    await page.getByTitle('Edit Details').click()

    // 4. Click the "Add File" button in the Documents section
    await page.getByTitle('Add File').click()

    // 5. Verify modal open
    await expect(page.getByText('File Attachment', { exact: true })).toBeVisible()

    // 6. Paste Google Sheet URL
    const docUrlInput = page.locator('label:has-text("URL (Optional)") + input')
    await docUrlInput.fill('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKv1a482i0K_aU89f6/edit?usp=sharing')

    // 7. Verify auto-naming behavior (should automatically name it "Google Sheet" if name was empty or generic)
    const docNameInput = page.locator('label:has-text("Document Name") + input')
    await expect(docNameInput).toHaveValue('Google Sheet')

    // 8. Save changes on the AttachmentDetailModal
    await page.getByRole('button', { name: 'save Save Changes' }).click()

    // 9. Verify the sheet is listed in the documents list with the "Google Sheet" badge/label
    await expect(page.getByRole('paragraph').filter({ hasText: 'Google Sheet' })).toBeVisible()
    await expect(page.getByText('Google Sheet').first()).toBeVisible()

    // 10. Click the Google Sheet document item to open the preview modal
    const docItem = page.getByRole('paragraph').filter({ hasText: 'Google Sheet' })
    await docItem.click()

    // 11. Verify iframe loads with correct preview embedUrl
    const previewIframe = page.locator('iframe[src="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKv1a482i0K_aU89f6/preview"]')
    await expect(previewIframe).toBeVisible()

    // Close preview modal
    await page.getByRole('button', { name: 'Close' }).last().click()

    // Close PlaceDetailModal by clicking Save Changes to verify persistence
    await page.getByRole('button', { name: 'check_circle Save Changes' }).click()
    await expect(page.getByRole('heading', { name: 'Eiffel Tower', level: 2 })).not.toBeVisible()
  })

  test('should successfully add a PDF document link directly using the inline input in PlaceDetailModal and open it', async ({ page }) => {
    await page.goto('/trip?id=101')
    await expect(page.getByRole('heading', { name: 'Current Paris Voyage' })).toBeVisible()

    // 1. Open PlaceDetailModal
    await page.getByRole('heading', { name: 'Eiffel Tower' }).click()
    await expect(page.getByRole('heading', { name: 'Eiffel Tower', level: 2 })).toBeVisible()

    // 2. Click Edit Details
    await page.getByTitle('Edit Details').click()

    // 3. Click the direct "Add Link" button in documents section
    await page.getByTitle('Add Document Link (Google Drive, public PDF, etc.)').click()

    // 4. Fill in the online PDF URL
    const linkInput = page.getByPlaceholder('Paste Google Drive, PDF, Doc, or Sheet link...')
    await expect(linkInput).toBeVisible()
    await linkInput.fill('https://example.com/map.pdf')
    await linkInput.press('Enter')

    // 5. Verify document named "PDF Document" with correct label and border is added on the flow
    await expect(page.getByRole('paragraph').filter({ hasText: 'PDF Document' })).toBeVisible()
    await expect(page.getByText('PDF Link').first()).toBeVisible()

    // 6. Verify clickable external link exists and matches the URL
    const openLinkBtn = page.getByTitle('Open Document Link')
    await expect(openLinkBtn).toBeVisible()
    await expect(openLinkBtn).toHaveAttribute('href', 'https://example.com/map.pdf')
    await expect(openLinkBtn).toHaveAttribute('target', '_blank')

    // 7. Save changes
    await page.getByRole('button', { name: 'check_circle Save Changes' }).click()
    await expect(page.getByRole('heading', { name: 'Eiffel Tower', level: 2 })).not.toBeVisible()

    // 8. Verify the timeline rendering matches
    // Place Documents list on the main timeline should render the item styled
    await expect(page.getByRole('heading', { name: 'Eiffel Tower' })).toBeVisible()
    await expect(page.getByText('PDF Document')).toBeVisible()
    
    // Check timeline direct open link
    const timelineOpenBtn = page.locator('a[title="Open link in new tab"]').filter({ hasText: 'open_in_new' })
    await expect(timelineOpenBtn).toBeVisible()
    await expect(timelineOpenBtn).toHaveAttribute('href', 'https://example.com/map.pdf')
  })

  test('should successfully add a Google Sheet link in TransportDetailModal and show on timeline with click launch', async ({ page }) => {
    await page.goto('/trip?id=101')
    await expect(page.getByRole('heading', { name: 'Current Paris Voyage' })).toBeVisible()

    // Click transport connection card to open TransportDetailModal
    await page.getByRole('heading', { name: 'Rail' }).first().click()

    // 2. Verify TransportDetailModal is open
    await expect(page.getByText('Eiffel Tower → Louvre Museum')).toBeVisible()

    // 3. Click "Edit Route" on Transport modal
    await page.getByTitle('Edit Route').click()

    // 4. Click the "Add Link" button in Documents section
    await page.getByTitle('Add Document Link (Google Drive, public PDF, etc.)').click()

    // 5. Fill inline link input
    const linkInput = page.getByPlaceholder('Paste Google Drive, PDF, Doc, or Sheet link...')
    await expect(linkInput).toBeVisible()
    await linkInput.fill('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKv1a482i0K_aU89f6/edit?usp=sharing')
    await linkInput.press('Enter')

    // 6. Verify "Google Sheet" document is listed on-the-flow
    await expect(page.getByRole('paragraph').filter({ hasText: 'Google Sheet' })).toBeVisible()
    await expect(page.getByText('Google Sheet').first()).toBeVisible()

    // Verify external link icon matches
    const openLinkBtn = page.getByTitle('Open Document Link')
    await expect(openLinkBtn).toBeVisible()
    await expect(openLinkBtn).toHaveAttribute('href', 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKv1a482i0K_aU89f6/edit?usp=sharing')

    // 7. Save changes on TransportDetailModal
    await page.getByRole('button', { name: 'save Save Route' }).click()
    await expect(page.getByRole('heading', { name: 'Edit Transport' })).not.toBeVisible()

    // 8. Verify the timeline documents list for the Transport leg renders with external launch link
    await expect(page.getByText('Google Sheet').first()).toBeVisible()
    
    // Verify timeline clickable launch button exists
    const timelineOpenBtn = page.locator('a[title="Open link in new tab"]').filter({ hasText: 'open_in_new' })
    await expect(timelineOpenBtn).toBeVisible()
    await expect(timelineOpenBtn).toHaveAttribute('href', 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKv1a482i0K_aU89f6/edit?usp=sharing')
  })
})

