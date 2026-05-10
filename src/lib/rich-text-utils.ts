/**
 * Toggles a checkbox in a TipTap HTML string at a specific index.
 */
export function toggleHtmlCheckbox(html: string, index: number): string {
  if (typeof window === 'undefined') return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const checkboxes = doc.querySelectorAll('input[type="checkbox"]');

  if (index >= 0 && index < checkboxes.length) {
    const checkbox = checkboxes[index] as HTMLInputElement;
    const isChecked = checkbox.hasAttribute('checked');
    
    // Find the parent list item to update data-checked attribute
    const li = checkbox.closest('li');
    
    if (isChecked) {
      checkbox.removeAttribute('checked');
      if (li) li.setAttribute('data-checked', 'false');
    } else {
      checkbox.setAttribute('checked', 'checked');
      if (li) li.setAttribute('data-checked', 'true');
    }
    
    return doc.body.innerHTML;
  }

  return html;
}

/**
 * Checks if a string is likely HTML.
 */
export function isHtml(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  return trimmed.startsWith('<') && trimmed.endsWith('>');
}

/**
 * Ensures a string is HTML by converting plain text newlines to paragraphs.
 * If it's already HTML, returns it as-is.
 */
export function ensureHtml(text: string): string {
  if (!text) return '';
  if (isHtml(text)) return text;

  // Convert plain text newlines to HTML paragraphs
  return text
    .split(/\n\n+/)
    .map(p => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`)
    .join('');
}
