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
