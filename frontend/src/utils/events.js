export const COUNTS_CHANGED_EVENT = 'jb:counts-changed';

export function notifyCountsChanged() {
  window.dispatchEvent(new Event(COUNTS_CHANGED_EVENT));
}
