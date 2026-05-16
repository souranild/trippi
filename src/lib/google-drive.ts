/**
 * Google Drive sync utility for Trippi.
 * Saves trip data as JSON files inside a "trippi" folder in the user's Google Drive.
 * Uses the Google Drive REST API v3 with the access token from Firebase Auth.
 */

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_NAME = 'trippi';
const ALL_TRIPS_FILE = 'trippi-backup.json';

// In-memory cache for the folder ID to avoid repeated lookups
let cachedFolderId: string | null = null;

/**
 * Get the stored Google access token from localStorage.
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('googleAccessToken');
}

/**
 * Store the Google access token in localStorage.
 */
export function setAccessToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('googleAccessToken', token);
}

/**
 * Clear the stored access token.
 */
export function clearAccessToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('googleAccessToken');
  cachedFolderId = null;
}

/**
 * Check if Drive sync is available (user is signed in with Google and has a token).
 */
export function isDriveSyncAvailable(): boolean {
  return !!getAccessToken();
}

/**
 * Find or create the "trippi" folder in the user's Google Drive.
 * Returns the folder ID.
 */
async function getOrCreateFolder(accessToken: string): Promise<string> {
  if (cachedFolderId) return cachedFolderId;

  // Search for existing folder
  const searchParams = new URLSearchParams({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id,name)',
    spaces: 'drive',
  });

  const searchRes = await fetch(`${DRIVE_API}/files?${searchParams}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!searchRes.ok) {
    const err = await searchRes.text();
    console.error('Drive folder search failed:', err);
    throw new Error('Failed to search Google Drive');
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    cachedFolderId = searchData.files[0].id;
    return cachedFolderId!;
  }

  // Create the folder
  const createRes = await fetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    console.error('Drive folder creation failed:', err);
    throw new Error('Failed to create trippi folder in Google Drive');
  }

  const createData = await createRes.json();
  cachedFolderId = createData.id;
  return cachedFolderId!;
}

/**
 * Find an existing file by name inside the trippi folder.
 * Returns the file ID or null.
 */
async function findFile(accessToken: string, folderId: string, fileName: string): Promise<string | null> {
  const searchParams = new URLSearchParams({
    q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id,name,modifiedTime)',
    spaces: 'drive',
  });

  const res = await fetch(`${DRIVE_API}/files?${searchParams}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return null;

  const data = await res.json();
  return data.files?.[0]?.id || null;
}

/**
 * Upload or update a JSON file in the trippi folder.
 */
async function uploadFile(accessToken: string, folderId: string, fileName: string, content: any): Promise<void> {
  const existingFileId = await findFile(accessToken, folderId, fileName);
  const jsonContent = JSON.stringify(content, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });

  if (existingFileId) {
    // Update existing file
    const res = await fetch(`${UPLOAD_API}/files/${existingFileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: blob,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Drive file update failed:', err);
      throw new Error('Failed to update file in Google Drive');
    }
  } else {
    // Create new file with multipart upload
    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: 'application/json',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const res = await fetch(`${UPLOAD_API}/files?uploadType=multipart`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Drive file creation failed:', err);
      throw new Error('Failed to create file in Google Drive');
    }
  }
}

/**
 * Download a JSON file from the trippi folder.
 * Returns the parsed content or null if not found.
 */
async function downloadFile(accessToken: string, folderId: string, fileName: string): Promise<any | null> {
  const fileId = await findFile(accessToken, folderId, fileName);
  if (!fileId) return null;

  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return null;
  return res.json();
}

/**
 * Sync all trips to Google Drive.
 * This is the main function called from the save flow.
 * It runs in the background and doesn't block the UI.
 */
export async function syncTripsToDrive(trips: any[]): Promise<void> {
  const accessToken = getAccessToken();
  if (!accessToken) return; // Not signed in, skip silently

  try {
    const folderId = await getOrCreateFolder(accessToken);
    await uploadFile(accessToken, folderId, ALL_TRIPS_FILE, {
      version: 1,
      lastSynced: new Date().toISOString(),
      trips,
    });
    console.log('✅ Trips synced to Google Drive');
  } catch (error: any) {
    // If token expired, clear it
    if (error.message?.includes('401') || error.message?.includes('403')) {
      console.warn('Google Drive token expired, clearing...');
      clearAccessToken();
    }
    console.error('Drive sync failed (non-blocking):', error);
  }
}

/**
 * Load trips from Google Drive.
 * Returns the trips array or null if not available.
 */
export async function loadTripsFromDrive(): Promise<any[] | null> {
  const accessToken = getAccessToken();
  if (!accessToken) return null;

  try {
    const folderId = await getOrCreateFolder(accessToken);
    const data = await downloadFile(accessToken, folderId, ALL_TRIPS_FILE);
    if (data?.trips && Array.isArray(data.trips)) {
      console.log('✅ Trips loaded from Google Drive');
      return data.trips;
    }
    return null;
  } catch (error) {
    console.error('Drive load failed (non-blocking):', error);
    return null;
  }
}
