<div align="center">

# Make it louder!

**A privacy-first browser extension that amplifies per-tab audio up to 500%.**

[![Version](https://img.shields.io/badge/version-2.0.1-6366f1?style=flat-square)](https://github.com/lezzowski/make-it-louder/releases)
[![License](https://img.shields.io/badge/license-MIT-6366f1?style=flat-square)](LICENSE)
[![Built with WXT](https://img.shields.io/badge/built%20with-WXT-6366f1?style=flat-square)](https://wxt.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)

</div>

---

## What it does

Make it louder! routes any tab's audio through the Web Audio API and lets you freely amplify it beyond what the browser or OS normally allows. Volume, bass, and stereo/mono mode are all controlled from a clean three-tab popup. Every setting is per-tab and stateless — nothing is ever written to disk or sent anywhere.

---

## Features

**Volume**
- Amplify audio from 0% (full mute) up to 500% in real time
- Dynamic toolbar badge: blank at 100%, percentage shown above it, red "MUTE" label at 0%
- Warning indicator displayed above 300% to signal potential audio clipping

**Advanced audio controls**
- Bass boost via a lowshelf filter centered at 200 Hz, adjustable from 0 to +20 dB
- Mono downmix toggle — collapses stereo output to a single centered channel without extra splitter nodes

**Presets**
| Preset | Volume | Bass | Mode |
|--------|--------|------|------|
| Movie | 250% | +10 dB | Stereo |
| Podcast | 150% | 0 dB | Stereo |
| Reset | 100% | 0 dB | Stereo |

**Privacy**
- No network requests of any kind
- No storage access — all state lives in memory and is discarded when the popup closes
- Declared as collecting no user data (`data_collection_permissions: none`) in the Firefox manifest
- Requires only `activeTab` and `scripting` permissions

---

## Architecture

The extension is composed of three independent scripts that communicate via the browser messaging API.

```
entrypoints/
├── background.ts        Badge manager — listens for volume updates and sets badge text/color
├── content.ts           Web Audio engine — injected on demand into the active tab
└── popup/
    ├── index.html       Popup shell with three tabs: Control, Advanced, About
    ├── main.ts          UI controller — handles sliders, presets, and tab switching
    └── style.css        Self-contained styles, no external dependencies
```

### Audio graph

Each `<audio>` and `<video>` element discovered in the page gets its own node chain:

```
MediaElementSource → GainNode → BiquadFilterNode (lowshelf 200 Hz) → AudioDestination
```

Elements that are added dynamically (single-page apps, lazy-loaded players) are picked up by a `MutationObserver` watching `document.body`. All nodes are disconnected and the `AudioContext` is closed on `beforeunload` to prevent memory leaks.

---

## Getting started

### Requirements

| Requirement | Version |
|-------------|---------|
| Node.js | 18 or higher |
| npm | 9 or higher |

### Development

```bash
# Install dependencies
npm install

# Launch a dev browser with hot reload (Chrome/Edge)
npm run dev

# Launch on Firefox (Manifest V3)
npm run dev:firefox
```

### Building for distribution

```bash
# Chrome / Edge (Manifest V3)
npm run build
npm run zip

# Firefox (Manifest V3)
npm run build:firefox
npm run zip:firefox
```

The zipped extension is written to `.output/`. The unzipped build is at `.output/chrome-mv3/` or `.output/firefox-mv3/` respectively.

### Type checking

```bash
npm run compile
```

---

## Tech stack

| Tool | Role | License |
|------|------|---------|
| [WXT](https://wxt.dev) v0.20.x | Extension framework — manifest generation, dev server, bundling | MIT |
| [Vite](https://vitejs.dev) v8.x | Bundler (used internally by WXT) | MIT |
| [TypeScript](https://typescriptlang.org) v5.x | Static typing across all entrypoints | Apache-2.0 |
| Web Audio API | In-browser audio processing (no native code) | Browser built-in |

---

## Browser compatibility

| Browser | Supported | Notes |
|---------|-----------|-------|
| Chrome / Chromium | It should but didn't try | Manifest V3 |
| Microsoft Edge | It should but didn't try | Manifest V3 |
| Firefox | Yes | Manifest V3 via `--mv3` flag |

---

## Contributing

Contributions are welcome. Please open an issue before submitting a pull request so the change can be discussed first.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Open a pull request against `main`

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
