/**
 * Content script — Web Audio API engine (V2).
 *
 * Audio graph per media element:
 *   MediaElementSource → GainNode → BiquadFilterNode (lowshelf 200Hz) → destination
 *
 * Mono downmix is handled by setting `channelCount = 1` and
 * `channelCountMode = 'explicit'` on the destination connection,
 * which collapses stereo to mono without extra splitter/merger nodes.
 *
 * Cleanup: all nodes are disconnected and AudioContext is closed on `beforeunload`.
 */

/** Shared AudioContext — one per tab injection lifecycle. */
let audioContext: AudioContext | null = null;

/** Per-element node chain for global parameter updates. */
interface MediaNodeChain {
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  bass: BiquadFilterNode;
}

const nodeChains: MediaNodeChain[] = [];

/** Current mono state — applied via channelCount on BiquadFilter output. */
let monoEnabled = false;

/** Marker attribute to prevent double-wiring (createMediaElementSource is one-shot). */
const BOOSTED_ATTR = 'data-vlb-boosted';

/**
 * Connects a single media element to the full audio pipeline.
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

    const bassFilter = audioContext.createBiquadFilter();
    bassFilter.type = 'lowshelf';
    bassFilter.frequency.value = 200;
    bassFilter.gain.value = 0; // 0dB = no boost by default

    // Wire: source → gain → bass → destination
    source.connect(gainNode);
    gainNode.connect(bassFilter);
    bassFilter.connect(audioContext.destination);

    nodeChains.push({ source, gain: gainNode, bass: bassFilter });
    el.setAttribute(BOOSTED_ATTR, 'true');
  } catch (err) {
    // Edge case: element might already be captured by another extension or script.
    console.warn('[Make it louder!] Failed to connect media element:', err);
  }
}

/**
 * Scans the entire document for <audio> and <video> elements
 * and wires each one through the audio pipeline.
 */
function scanAndConnect(): void {
  const mediaElements = document.querySelectorAll<HTMLMediaElement>('audio, video');
  mediaElements.forEach(connectMediaElement);
}

/**
 * Applies the given gain value to ALL active GainNodes.
 * Uses `setValueAtTime` to prevent audio pops/clicks.
 *
 * @param value - Gain multiplier (0.0 = mute, 5.0 = 500%).
 */
function applyGain(value: number): void {
  if (!audioContext) return;
  for (const chain of nodeChains) {
    chain.gain.gain.setValueAtTime(value, audioContext.currentTime);
  }
}

/**
 * Applies the given bass boost to ALL active BiquadFilterNodes.
 *
 * @param dB - Bass gain in decibels (0–20).
 */
function applyBass(dB: number): void {
  if (!audioContext) return;
  for (const chain of nodeChains) {
    chain.bass.gain.setValueAtTime(dB, audioContext.currentTime);
  }
}

/**
 * Toggles mono downmix by reconnecting filter outputs.
 * Mono: channelCount=1, explicit mode collapses stereo to center.
 * Stereo: channelCount=2, default mode restores original channels.
 *
 * @param enabled - Whether to enable mono downmix.
 */
function applyMono(enabled: boolean): void {
  if (!audioContext) return;
  monoEnabled = enabled;

  for (const chain of nodeChains) {
    chain.bass.disconnect();
    if (monoEnabled) {
      chain.bass.channelCount = 1;
      chain.bass.channelCountMode = 'explicit';
    } else {
      chain.bass.channelCount = 2;
      chain.bass.channelCountMode = 'max';
    }
    chain.bass.connect(audioContext.destination);
  }
}

/**
 * Disconnects all audio nodes and closes the AudioContext.
 * Prevents memory leaks when the tab is closed or navigated away.
 */
function cleanup(): void {
  for (const chain of nodeChains) {
    try {
      chain.bass.disconnect();
      chain.gain.disconnect();
      chain.source.disconnect();
    } catch {
      // Node may already be disconnected — safe to ignore.
    }
  }
  nodeChains.length = 0;

  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
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
          if (node instanceof HTMLElement) {
            const nested = node.querySelectorAll<HTMLMediaElement>('audio, video');
            nested.forEach(connectMediaElement);
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Cleanup on tab close / navigation to prevent memory leaks.
    window.addEventListener('beforeunload', cleanup);

    // Listen for messages from the popup.
    browser.runtime.onMessage.addListener(
      (message: { type: string; value: number | boolean }) => {
        // Resume AudioContext if suspended (browser autoplay policy).
        if (audioContext?.state === 'suspended') {
          audioContext.resume();
        }

        switch (message.type) {
          case 'setGain':
            applyGain(message.value as number);
            break;
          case 'setBass':
            applyBass(message.value as number);
            break;
          case 'setMono':
            applyMono(message.value as boolean);
            break;
        }
      },
    );
  },
});
