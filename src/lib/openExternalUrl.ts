/**
 * Open a URL in a new tab using a transient anchor — more reliable than
 * window.open() when the call chain is not a direct user gesture.
 */
export function openExternalUrl(url: string): void {
  if (typeof document === 'undefined') return;
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
