/**
 * Popup script — Slider controller + view management (V2).
 *
 * Responsibilities:
 * 1. Injects the content script into the active tab on popup open.
 * 2. Maps volume slider (0–500) to gain (0.0–5.0).
 * 3. Maps bass slider (0–20) to dB.
 * 4. Sends mono toggle state.
 * 5. Handles preset buttons (Movie, Podcast, Reset).
 * 6. Updates badge ("MUTE" at 0%, percentage above 100%, empty at 100%).
 * 7. Manages 3-tab view switching: Control / Advanced / About.
 */

// --- DOM References ---
const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
const volumeLabel = document.getElementById('volume-label') as HTMLElement;
const warningBox = document.getElementById('warning-box') as HTMLElement;
const bassSlider = document.getElementById('bass-slider') as HTMLInputElement;
const bassValue = document.getElementById('bass-value') as HTMLElement;
const monoToggle = document.getElementById('mono-toggle') as HTMLInputElement;

// Tabs
const tabControl = document.getElementById('tab-control') as HTMLButtonElement;
const tabAdvanced = document.getElementById('tab-advanced') as HTMLButtonElement;
const tabAbout = document.getElementById('tab-about') as HTMLButtonElement;
const viewControl = document.getElementById('view-control') as HTMLElement;
const viewAdvanced = document.getElementById('view-advanced') as HTMLElement;
const viewAbout = document.getElementById('view-about') as HTMLElement;

// Presets
const presetMovie = document.getElementById('preset-movie') as HTMLButtonElement;
const presetPodcast = document.getElementById('preset-podcast') as HTMLButtonElement;
const presetReset = document.getElementById('preset-reset') as HTMLButtonElement;

/** All tabs and views for easy iteration. */
const tabs = [tabControl, tabAdvanced, tabAbout];
const views = [viewControl, viewAdvanced, viewAbout];

/** Cache active tab ID to scope all messages. */
let activeTabId: number | undefined;

// --- Tab Helpers ---

/**
 * Returns the currently active browser tab.
 */
async function getActiveTab(): Promise<Browser.tabs.Tab | undefined> {
  const results = await browser.tabs.query({ active: true, currentWindow: true });
  return results[0];
}

/**
 * Injects the content script into the given tab.
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

// --- Messaging ---

/**
 * Sends a typed message to the content script in the active tab.
 */
async function sendToContent(type: string, value: number | boolean): Promise<void> {
  if (!activeTabId) return;
  try {
    await browser.tabs.sendMessage(activeTabId, { type, value });
  } catch (err) {
    console.warn('[Make it louder!] Failed to send message:', err);
  }
}

/**
 * Notifies the background script to update the toolbar badge.
 *
 * @param percentage - Current volume percentage (0–500).
 */
async function updateBadge(percentage: number): Promise<void> {
  await browser.runtime.sendMessage({
    type: 'updateBadge',
    value: percentage,
    tabId: activeTabId,
  });
}

// --- UI Sync ---

/**
 * Synchronizes the volume UI to reflect the given percentage:
 *  - Updates the label text and color class
 *  - Toggles the warning box at 300%+
 */
function updateVolumeUI(percentage: number): void {
  volumeLabel.textContent = `${percentage}%`;

  // Toggle warning at 300%+ threshold.
  if (percentage > 300) {
    warningBox.classList.remove('hidden');
  } else {
    warningBox.classList.add('hidden');
  }

  // Dynamic label coloring.
  if (percentage === 0) {
    volumeLabel.className = 'level-mute';
  } else if (percentage <= 100) {
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

/**
 * Updates the bass value label.
 */
function updateBassUI(dB: number): void {
  bassValue.textContent = `${dB} dB`;
}

/**
 * Applies a full state snapshot — used by presets to set everything at once.
 */
function applyState(volume: number, bass: number, mono: boolean): void {
  // Update sliders and toggle
  volumeSlider.value = String(volume);
  bassSlider.value = String(bass);
  monoToggle.checked = mono;

  // Update UI
  updateVolumeUI(volume);
  updateBassUI(bass);

  // Send to content script
  sendToContent('setGain', volume / 100);
  sendToContent('setBass', bass);
  sendToContent('setMono', mono);

  // Update badge
  updateBadge(volume);
}

// --- View Switching ---

/**
 * Activates the given tab index and hides the rest.
 */
function switchTab(index: number): void {
  tabs.forEach((tab, i) => {
    tab.classList.toggle('active', i === index);
  });
  views.forEach((view, i) => {
    view.classList.toggle('active', i === index);
  });
}

// --- Event Handlers ---

/** Volume slider: real-time feedback. */
volumeSlider.addEventListener('input', () => {
  const percentage = parseInt(volumeSlider.value, 10);
  updateVolumeUI(percentage);
  sendToContent('setGain', percentage / 100);
  updateBadge(percentage);
});

/** Bass slider: real-time feedback. */
bassSlider.addEventListener('input', () => {
  const dB = parseInt(bassSlider.value, 10);
  updateBassUI(dB);
  sendToContent('setBass', dB);
});

/** Mono toggle. */
monoToggle.addEventListener('change', () => {
  sendToContent('setMono', monoToggle.checked);
});

/** Preset: Movie — 250% vol + 10dB bass. */
presetMovie.addEventListener('click', () => {
  applyState(250, 10, false);
});

/** Preset: Podcast — 150% vol + 0dB bass (clarity focus). */
presetPodcast.addEventListener('click', () => {
  applyState(150, 0, false);
});

/** Preset: Reset — 100% vol + 0dB bass + stereo. */
presetReset.addEventListener('click', () => {
  applyState(100, 0, false);
});

/** Tab switching. */
tabControl.addEventListener('click', () => switchTab(0));
tabAdvanced.addEventListener('click', () => switchTab(1));
tabAbout.addEventListener('click', () => switchTab(2));

// --- Initialization ---

(async () => {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  activeTabId = tab.id;
  await injectContentScript(activeTabId);
})();
