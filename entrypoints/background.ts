/**
 * Background script — Badge manager.
 *
 * Listens for `updateBadge` messages from the popup and sets the toolbar
 * icon badge text to reflect the current volume percentage.
 * Badge is cleared when volume is at the default 100%.
 */

const BADGE_COLOR = '#6366f1'; // Indigo-500 — visible on both light and dark toolbars.

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (message: { type: string; value: number; tabId?: number }) => {
      if (message.type !== 'updateBadge') return;

      const percentage = Math.round(message.value);
      const text = percentage <= 100 ? '' : String(percentage);

      browser.action.setBadgeText({ text, tabId: message.tabId });
      browser.action.setBadgeBackgroundColor({ color: BADGE_COLOR, tabId: message.tabId });
    },
  );
});
