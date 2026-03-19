/**
 * Content script — Web Audio API engine.
 *
 * Why `registration: 'runtime'`: This script is injected on-demand via
 * `browser.scripting.executeScript` from the popup, NOT auto-injected on matching URLs.
 * This avoids unnecessary overhead on every page load.
 *
 * Architecture:
 * 1. Scans all <audio>/<video> elements on the page.
 * 2. Wires each through AudioContext → MediaElementSource → GainNode → destination.
 * 3. Watches for dynamically added media via MutationObserver.
 * 4. Listens for `setGain` messages from the popup to adjust gain in real-time.
 */

/** Shared AudioContext — one per tab injection lifecycle. */
let audioContext: AudioContext | null = null;

/** All active GainNodes in this tab, used to apply gain changes globally. */
const gainNodes: GainNode[] = [];

/** Marker attribute to prevent double-wiring (createMediaElementSource is one-shot). */
const BOOSTED_ATTR = 'data-vlb-boosted';

/**
 * Connects a single media element to a GainNode via the Web Audio API.
 * Skips elements already processed (marked with BOOSTED_ATTR).
 *
 * @param el - The HTMLMediaElement (<audio> or <video>) to amplify.
 */
function connectMediaElement(el: HTMLMediaElement): void {
  if (el.hasAttribute(BOOSTED_ATTR)) return;

  if (!audioContext) {
    audioContext = new AudioContext();
  }

  try {
    const source = audioContext.createMediaElementSource(el);
    const gainNode = audioContext.createGain();

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    gainNodes.push(gainNode);
    el.setAttribute(BOOSTED_ATTR, 'true');
  } catch (err) {
    // Edge case: element might already be captured by another extension or script.
    console.warn('[Make it louder!] Failed to connect media element:', err);
  }
}

/**
 * Scans the entire document for <audio> and <video> elements
 * and wires each one through the gain pipeline.
 */
function scanAndConnect(): void {
  const mediaElements = document.querySelectorAll<HTMLMediaElement>('audio, video');
  mediaElements.forEach(connectMediaElement);
}

/**
 * Applies the given gain value to ALL active GainNodes.
 * Uses `setValueAtTime` instead of direct assignment to prevent audio pops/clicks.
 *
 * @param value - Gain multiplier (1.0 = 100%, 5.0 = 500%).
 */
function applyGain(value: number): void {
  if (!audioContext) return;

  for (const node of gainNodes) {
    node.gain.setValueAtTime(value, audioContext.currentTime);
  }
}

export default defineContentScript({
  matches: ['<all_urls>'],
  registration: 'runtime',

  main() {
    // Initial scan for existing media elements.
    scanAndConnect();

    // Watch for dynamically added media elements (SPAs, lazy-loaded players).
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLMediaElement) {
            connectMediaElement(node);
          }
          // Also check children of added containers.
          if (node instanceof HTMLElement) {
            const nested = node.querySelectorAll<HTMLMediaElement>('audio, video');
            nested.forEach(connectMediaElement);
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Listen for gain adjustment messages from the popup.
    browser.runtime.onMessage.addListener(
      (message: { type: string; value: number }) => {
        if (message.type === 'setGain') {
          // Resume AudioContext if suspended (browser autoplay policy).
          if (audioContext?.state === 'suspended') {
            audioContext.resume();
          }
          applyGain(message.value);
        }
      },
    );
  },
});
