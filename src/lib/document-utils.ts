/**
 * Parses a Google Drive or Google Docs/Sheets/Slides URL and extracts
 * the file/doc ID to build preview and direct open links.
 */
export function parseGoogleDriveUrl(url: string) {
  if (!url) return null

  // 1. Google Drive File
  // e.g. https://drive.google.com/file/d/FILE_ID/view?usp=sharing or https://drive.google.com/open?id=FILE_ID
  const driveFileRegex = /drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/
  const driveFileMatch = url.match(driveFileRegex)
  if (driveFileMatch) {
    const fileId = driveFileMatch[1]
    return {
      type: 'drive-file',
      id: fileId,
      previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      openUrl: url,
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`
    }
  }

  // 2. Google Docs
  // e.g. https://docs.google.com/document/d/DOC_ID/edit?usp=sharing
  const docRegex = /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/
  const docMatch = url.match(docRegex)
  if (docMatch) {
    const docId = docMatch[1]
    return {
      type: 'google-doc',
      id: docId,
      previewUrl: `https://docs.google.com/document/d/${docId}/preview`,
      openUrl: url,
      embedUrl: `https://docs.google.com/document/d/${docId}/preview`
    }
  }

  // 3. Google Sheets
  // e.g. https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit?usp=sharing
  const sheetRegex = /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/
  const sheetMatch = url.match(sheetRegex)
  if (sheetMatch) {
    const sheetId = sheetMatch[1]
    return {
      type: 'google-sheet',
      id: sheetId,
      previewUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/preview`,
      openUrl: url,
      embedUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/preview`
    }
  }

  // 4. Google Slides
  // e.g. https://docs.google.com/presentation/d/PRESENTATION_ID/edit?usp=sharing
  const slideRegex = /docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/
  const slideMatch = url.match(slideRegex)
  if (slideMatch) {
    const slideId = slideMatch[1]
    return {
      type: 'google-slide',
      id: slideId,
      previewUrl: `https://docs.google.com/presentation/d/${slideId}/preview`,
      openUrl: url,
      embedUrl: `https://docs.google.com/presentation/d/${slideId}/preview`
    }
  }

  // 5. Google Forms
  // e.g. https://docs.google.com/forms/d/FORM_ID/viewform
  const formRegex = /docs\.google\.com\/forms\/d\/(e\/[a-zA-Z0-9_-]+|[a-zA-Z0-9_-]+)/
  const formMatch = url.match(formRegex)
  if (formMatch) {
    const formId = formMatch[1]
    return {
      type: 'google-form',
      id: formId,
      previewUrl: url.includes('/viewform') ? url : `https://docs.google.com/forms/d/${formId}/viewform?embedded=true`,
      openUrl: url,
      embedUrl: url.includes('/viewform') ? url : `https://docs.google.com/forms/d/${formId}/viewform?embedded=true`
    }
  }

  return null
}

/**
 * Classifies an online link to return structured previewable URLs and classifications.
 */
export function getOnlineDocumentDetails(url: string) {
  if (!url) return null

  // Ensure URL has a protocol
  let normalizedUrl = url.trim()
  if (!/^[a-zA-Z][a-zA-Z\d.+\-]*:/.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`
  }

  const googleDetails = parseGoogleDriveUrl(normalizedUrl)
  if (googleDetails) {
    return googleDetails
  }

  // Check if PDF
  const isPdf = normalizedUrl.toLowerCase().split('?')[0].endsWith('.pdf')
  if (isPdf) {
    return {
      type: 'pdf',
      previewUrl: normalizedUrl,
      openUrl: normalizedUrl,
      embedUrl: normalizedUrl
    }
  }

  // Check if typical Microsoft Office or common format that Google Doc Viewer can render
  const isOfficeDoc = normalizedUrl.toLowerCase().split('?')[0].match(/\.(docx?|xlsx?|pptx?)$/)
  if (isOfficeDoc) {
    return {
      type: 'office',
      previewUrl: `https://docs.google.com/gview?url=${encodeURIComponent(normalizedUrl)}&embedded=true`,
      openUrl: normalizedUrl,
      embedUrl: `https://docs.google.com/gview?url=${encodeURIComponent(normalizedUrl)}&embedded=true`
    }
  }

  // Generic online document
  return {
    type: 'online-doc',
    previewUrl: normalizedUrl,
    openUrl: normalizedUrl,
    embedUrl: normalizedUrl
  }
}

/**
 * Resolves the visual styling, label, and icon for a document based on its URL or local attachment.
 */
export function getDocumentIconAndBadge(url?: string, file?: string) {
  if (url && url.match(/^https?:\/\//)) {
    const details = getOnlineDocumentDetails(url)
    if (details) {
      switch (details.type) {
        case 'google-doc':
          return {
            icon: 'article',
            label: 'Google Doc',
            color: 'text-blue-400',
            bg: 'bg-blue-400/10',
            border: 'border-blue-400/20'
          }
        case 'google-sheet':
          return {
            icon: 'table_view',
            label: 'Google Sheet',
            color: 'text-emerald-400',
            bg: 'bg-emerald-400/10',
            border: 'border-emerald-400/20'
          }
        case 'google-slide':
          return {
            icon: 'slideshow',
            label: 'Google Slide',
            color: 'text-amber-400',
            bg: 'bg-amber-400/10',
            border: 'border-amber-400/20'
          }
        case 'google-form':
          return {
            icon: 'assignment',
            label: 'Google Form',
            color: 'text-purple-400',
            bg: 'bg-purple-400/10',
            border: 'border-purple-400/20'
          }
        case 'drive-file':
          return {
            icon: 'cloud',
            label: 'Drive File',
            color: 'text-indigo-400',
            bg: 'bg-indigo-400/10',
            border: 'border-indigo-400/20'
          }
        case 'pdf':
          return {
            icon: 'picture_as_pdf',
            label: 'PDF Link',
            color: 'text-rose-400',
            bg: 'bg-rose-400/10',
            border: 'border-rose-400/20'
          }
        case 'office':
          return {
            icon: 'task',
            label: 'Office Doc',
            color: 'text-cyan-400',
            bg: 'bg-cyan-400/10',
            border: 'border-cyan-400/20'
          }
        default:
          return {
            icon: 'link',
            label: 'Doc Link',
            color: 'text-cyan-400',
            bg: 'bg-cyan-400/10',
            border: 'border-cyan-400/20'
          }
      }
    }
  }

  // If local file is an image
  if (file && file.startsWith('data:image/')) {
    return {
      icon: 'image',
      label: 'Image File',
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
      border: 'border-purple-400/20'
    }
  }

  // Standard Local uploaded file
  return {
    icon: 'description',
    label: 'Local File',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20'
  }
}
