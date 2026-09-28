import type { AppSettings, ThemePalette } from '@/core/platform/storage/storage-items';

export interface ThemePreset {
  id: string;
  name: string;
  palette: ThemePalette;
}

export const lightPresets: ThemePreset[] = [
  { id: 'frost', name: 'Frost', palette: { accent: '#1761ed', background: '#eef1f5', surface: '#ffffff', foreground: '#172033', secondaryText: '#657084', border: '#dfe4eb' } },
  { id: 'ocean', name: 'Ocean', palette: { accent: '#0284c7', background: '#edf7fb', surface: '#ffffff', foreground: '#153047', secondaryText: '#587286', border: '#d3e5ed' } },
  { id: 'mint', name: 'Mint', palette: { accent: '#059669', background: '#eef8f3', surface: '#ffffff', foreground: '#17372d', secondaryText: '#5f766e', border: '#d7e8e0' } },
  { id: 'amber', name: 'Amber', palette: { accent: '#d97706', background: '#fbf5e9', surface: '#fffdf8', foreground: '#392b19', secondaryText: '#796b58', border: '#eadfcb' } },
  { id: 'rose', name: 'Rose', palette: { accent: '#e11d48', background: '#fbf0f3', surface: '#fffafb', foreground: '#3c1d27', secondaryText: '#7c626b', border: '#edd8df' } },
  { id: 'violet', name: 'Violet', palette: { accent: '#7c3aed', background: '#f4f0fb', surface: '#ffffff', foreground: '#2c2142', secondaryText: '#706681', border: '#e2daee' } },
  { id: 'slate', name: 'Slate', palette: { accent: '#475569', background: '#f1f3f5', surface: '#ffffff', foreground: '#1e293b', secondaryText: '#64748b', border: '#dce1e7' } },
];

export const darkPresets: ThemePreset[] = [
  { id: 'midnight', name: 'Midnight', palette: { accent: '#3d85ff', background: '#111318', surface: '#1a1d23', foreground: '#f2f4f7', secondaryText: '#9098a5', border: '#2c323c' } },
  { id: 'graphite', name: 'Graphite', palette: { accent: '#a3aab8', background: '#121314', surface: '#1d1f21', foreground: '#f3f4f6', secondaryText: '#9ca3af', border: '#303338' } },
  { id: 'oled', name: 'OLED', palette: { accent: '#2f9cff', background: '#000000', surface: '#0d0f12', foreground: '#f8fafc', secondaryText: '#8b95a5', border: '#252932' } },
  { id: 'nord', name: 'Nord', palette: { accent: '#88c0d0', background: '#242933', surface: '#2e3440', foreground: '#eceff4', secondaryText: '#aeb8c7', border: '#414a59' } },
  { id: 'aubergine', name: 'Aubergine', palette: { accent: '#c084fc', background: '#17121d', surface: '#221a2b', foreground: '#f5effa', secondaryText: '#aa9bb6', border: '#3a2d46' } },
  { id: 'forest', name: 'Forest', palette: { accent: '#4ade80', background: '#0f1713', surface: '#18231d', foreground: '#edf7f0', secondaryText: '#91a99a', border: '#2b3d32' } },
  { id: 'ember', name: 'Ember', palette: { accent: '#fb923c', background: '#17120f', surface: '#241b16', foreground: '#fff3e9', secondaryText: '#b29c8c', border: '#3d2e25' } },
];

export const defaultLightPalette = lightPresets[0]!.palette;
export const defaultDarkPalette = darkPresets[0]!.palette;

export const getPalette = (settings: AppSettings | null | undefined, mode: 'light' | 'dark') => {
  const fallback = mode === 'light' ? defaultLightPalette : defaultDarkPalette;
  const saved = mode === 'light' ? settings?.lightPalette : settings?.darkPalette;
  const preset = mode === 'light' ? settings?.lightPreset : settings?.darkPreset;
  if (!saved) return fallback;
  // Refresh only unchanged built-in palettes from earlier releases. Custom
  // colors and other presets retain exactly the values the user chose.
  const legacy = mode === 'light'
    ? [{ ...defaultLightPalette, accent: '#2563eb' }, { accent: '#2563eb', background: '#eef1f5', surface: '#ffffff', foreground: '#1a1a1a', secondaryText: '#6b7280', border: '#e5e7eb' }]
    : [{ ...defaultDarkPalette, accent: '#4c8bf5' }];
  if (preset === (mode === 'light' ? 'frost' : 'midnight') && legacy.some(palette =>
    (Object.keys(palette) as Array<keyof ThemePalette>).every(key => palette[key] === saved[key]))) return fallback;
  return saved;
};

const paletteVariables: Array<[keyof ThemePalette, string]> = [
  ['accent', 'accent'],
  ['background', 'background'],
  ['surface', 'surface'],
  ['foreground', 'foreground'],
  ['secondaryText', 'secondary-text'],
  ['border', 'border'],
];

export function applyAppearance(settings: AppSettings | null | undefined) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const light = getPalette(settings, 'light');
  const dark = getPalette(settings, 'dark');
  for (const [key, variable] of paletteVariables) {
    root.style.setProperty(`--theme-light-${variable}`, light[key]);
    root.style.setProperty(`--theme-dark-${variable}`, dark[key]);
  }
}
