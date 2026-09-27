import { defineConfig } from 'wxt';
import preact from '@preact/preset-vite';

export default defineConfig({
  manifestVersion: 3,
  // Avoid bundling local test captures, credentials, or developer files into a
  // source archive when producing Firefox and Opera release packages.
  zip: { zipSources: false },
  srcDir: 'src',
  entrypointsDir: '../entrypoints',
    manifest: ({ browser }) => {
    const isE2E = process.env.R22E_E2E === '1';
    
    return {
      name: '__MSG_extensionName__',
      description: '__MSG_extensionDescription__',
      default_locale: 'en',
      icons: {
        16: 'icon-16.png',
        32: 'icon-32.png',
        48: 'icon-48.png',
        128: 'icon-128.png',
      },
      action: {
        default_title: 'R22E Station',
        default_icon: {
          16: 'icon-16.png',
          32: 'icon-32.png',
          48: 'icon-48.png',
          128: 'icon-128.png',
        },
      },
      permissions: ['storage', 'contextMenus', 'alarms', 'activeTab', 'scripting', ...(browser === 'firefox' ? [] : ['offscreen'])],
      host_permissions: isE2E ? ['*://*/*'] : undefined,
      optional_permissions: [
        'notifications',
        ...(browser === 'firefox' ? ['http://*/*', 'https://*/*'] : []),
      ],
      optional_host_permissions: browser === 'firefox' ? undefined : ['http://*/*', 'https://*/*'],
      ...(browser === 'firefox'
        ? {
            browser_specific_settings: {
              gecko: {
                id: 'synology-download-station@r22e',
                strict_min_version: '109.0',
                data_collection_permissions: {} // Fix warning
              },
            },
          }
        : {}),
    };
  },
  vite: () => ({
    plugins: [preact()],
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
    },
    css: {
      modules: {
        localsConvention: 'camelCase',
      },
    },
  }),
});
