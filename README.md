# Make it louder! — Build Instructions

## Overview

This is a Firefox extension built with [WXT](https://wxt.dev) (a Vite-based web extension framework) and TypeScript. The source TypeScript files are compiled and bundled into JavaScript for the final extension.

## Requirements

| Requirement | Version |
|-------------|---------|
| **OS** | Windows, macOS, or Linux |
| **Node.js** | 18.0.0 or higher |
| **npm** | 9.0.0 or higher (ships with Node.js) |

## Build Steps

Run the following commands from the project root directory:

```bash
# 1. Install dependencies
npm install

# 2. Build the extension for Firefox (Manifest V3)
npx wxt build -b firefox --mv3
```

The built extension files will be output to the `.output/firefox-mv3/` directory.

## Build Tools Used

| Tool | Purpose | License |
|------|---------|---------|
| [WXT](https://wxt.dev) v0.20.x | Web extension framework (scaffolding, manifest generation, dev server) | MIT |
| [Vite](https://vitejs.dev) v8.x | Bundler used internally by WXT | MIT |
| [TypeScript](https://typescriptlang.org) v5.x | Compiles `.ts` source files to `.js` | Apache-2.0 |

## Project Structure

```
entrypoints/
├── background.ts      → Compiled to background.js
├── content.ts         → Compiled to content-scripts/content.js
└── popup/
    ├── index.html     → Copied to popup.html
    ├── main.ts        → Bundled into chunks/popup-*.js
    └── style.css      → Bundled into assets/popup-*.css
```

## Verification

To verify the build output matches the submitted extension:

```bash
npm install
npx wxt build -b firefox --mv3
```

Compare the contents of `.output/firefox-mv3/` with the submitted extension zip.
