/**
 * Background script — Badge manager (V2).
 *
 * Badge states:
 * - 0%:   "MUTE" with red background
 * - 100%: cleared (empty string)
 * - >100%: percentage number with indigo background
 */

const BADGE_COLOR_DEFAULT = '#6366f1'; // Indigo-500
const BADGE_COLOR_MUTE = '#ef4444';    // Red-500

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (message: { type: string; value: number; tabId?: number }) => {
      if (message.type !== 'updateBadge') return;

      const percentage = Math.round(message.value);

      let text: string;
      let color: string;

      if (percentage === 0) {
        text = 'MUTE';
        color = BADGE_COLOR_MUTE;
      } else if (percentage <= 100) {
        text = '';
        color = BADGE_COLOR_DEFAULT;
      } else {
        text = String(percentage);
        color = BADGE_COLOR_DEFAULT;
      }

      browser.action.setBadgeText({ text, tabId: message.tabId });
      browser.action.setBadgeBackgroundColor({ color, tabId: message.tabId });
    },
  );
});
