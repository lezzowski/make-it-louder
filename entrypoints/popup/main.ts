/**
 * Popup script — Slider controller + view management.
 *
 * Responsibilities:
 * 1. Injects the content script into the active tab on popup open.
 * 2. Maps slider value (100–500) to gain (1.0–5.0) and sends to content script.
 * 3. Updates badge via background script.
 * 4. Toggles safety warning above 300%.
 * 5. Manages Control ↔ About view switching.
 */

// --- DOM References ---
const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
const volumeLabel = document.getElementById('volume-label') as HTMLElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const warningBox = document.getElementById('warning-box') as HTMLElement;
const tabControl = document.getElementById('tab-control') as HTMLButtonElement;
const tabAbout = document.getElementById('tab-about') as HTMLButtonElement;
const viewControl = document.getElementById('view-control') as HTMLElement;
const viewAbout = document.getElementById('view-about') as HTMLElement;

/** Cache active tab ID to scope all messages. */
let activeTabId: number | undefined;

/**
 * Returns the currently active tab in the current window.
 */
async function getActiveTab(): Promise<Browser.tabs.Tab | undefined> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

/**
 * Injects the content script into the given tab.
 * WXT runtime-registered content scripts are injected via scripting API.
 */
async function injectContentScript(tabId: number): Promise<void> {
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      files: ['/content-scripts/content.js'],
    });
  } catch (err) {
    console.warn('[Make it louder!] Content script injection failed:', err);
  }
}

/**
 * Sends the gain value to the content script in the active tab.
 * Gain is a float: slider 100 → 1.0, slider 500 → 5.0.
 *
 * @param percentage - Slider value (100–500).
 */
async function sendGain(percentage: number): Promise<void> {
  if (!activeTabId) return;

  const gain = percentage / 100;

  try {
    await browser.tabs.sendMessage(activeTabId, {
      type: 'setGain',
      value: gain,
    });
  } catch (err) {
    // Tab may have been closed or navigated away.
    console.warn('[Make it louder!] Failed to send gain:', err);
  }
}

/**
 * Notifies the background script to update the toolbar badge.
 *
 * @param percentage - Current volume percentage (100–500).
 */
async function updateBadge(percentage: number): Promise<void> {
  await browser.runtime.sendMessage({
    type: 'updateBadge',
    value: percentage,
    tabId: activeTabId,
  });
}

/**
 * Synchronizes the UI to reflect the given percentage value:
 *  - Updates the label text
 *  - Toggles the warning box visibility
 *  - Applies accent color to the label based on intensity
 */
function updateUI(percentage: number): void {
  volumeLabel.textContent = `${percentage}%`;

  // Toggle warning at 300%+ threshold.
  if (percentage > 300) {
    warningBox.classList.remove('hidden');
  } else {
    warningBox.classList.add('hidden');
  }

  // Dynamic label coloring based on volume intensity.
  if (percentage <= 100) {
    volumeLabel.className = '';
  } else if (percentage <= 200) {
    volumeLabel.className = 'level-low';
  } else if (percentage <= 300) {
    volumeLabel.className = 'level-mid';
  } else if (percentage <= 400) {
    volumeLabel.className = 'level-high';
  } else {
    volumeLabel.className = 'level-max';
  }
}

// --- Event Handlers ---

/** Slider input: fire on every movement for real-time feedback. */
volumeSlider.addEventListener('input', () => {
  const percentage = parseInt(volumeSlider.value, 10);
  updateUI(percentage);
  sendGain(percentage);
  updateBadge(percentage);
});

/** Reset button: snap everything back to 100%. */
resetBtn.addEventListener('click', () => {
  volumeSlider.value = '100';
  updateUI(100);
  sendGain(100);
  updateBadge(100);
});

/** View toggle: Control tab. */
tabControl.addEventListener('click', () => {
  tabControl.classList.add('active');
  tabAbout.classList.remove('active');
  viewControl.classList.add('active');
  viewAbout.classList.remove('active');
});

/** View toggle: About tab. */
tabAbout.addEventListener('click', () => {
  tabAbout.classList.add('active');
  tabControl.classList.remove('active');
  viewAbout.classList.add('active');
  viewControl.classList.remove('active');
});

// --- Initialization ---

(async () => {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  activeTabId = tab.id;
  await injectContentScript(activeTabId);
})();
