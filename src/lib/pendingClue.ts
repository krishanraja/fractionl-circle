export const PENDING_CLUE_KEY = 'circle.pendingClue';

export function readPendingClue(): string {
  try {
    return window.sessionStorage.getItem(PENDING_CLUE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function clearPendingClue(): void {
  try {
    window.sessionStorage.removeItem(PENDING_CLUE_KEY);
  } catch {
    // A blocked storage API should never block the main contact flow.
  }
}
