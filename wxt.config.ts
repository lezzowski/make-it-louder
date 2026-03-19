import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'Make it louder!',
    description: 'Amplify per-tab audio up to 500%. Privacy-first, stateless, lightweight.',
    version: '2.0.2',
    permissions: ['activeTab', 'scripting', 'storage'],
    icons: {
      '16': 'icon.svg',
      '32': 'icon.svg',
      '48': 'icon.svg',
      '96': 'icon.svg',
      '128': 'icon.svg',
    },
    browser_specific_settings: {
      gecko: {
        id: 'make-it-louder@extension.com',
        // Declares this extension collects no user data.
        // Schema per: https://mzl.la/firefox-builtin-data-consent
        // `as any` workaround: WXT v0.20 types don't include this field yet.
        data_collection_permissions: { required: ['none'] },
      } as any,
    },
  },
});

