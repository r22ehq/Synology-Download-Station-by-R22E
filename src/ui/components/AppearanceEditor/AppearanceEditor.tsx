import { useEffect, useState } from 'preact/hooks';
import { Monitor, Moon, RotateCcw, Sun } from 'lucide-preact';
import type { ThemePalette } from '@/core/platform/storage/storage-items';
import { settings, updateSettings } from '../../state/app-state';
import { darkPresets, defaultDarkPalette, defaultLightPalette, getPalette, lightPresets } from '../../theme/appearance';
import { Button } from '../Button/Button';
import styles from './AppearanceEditor.module.css';
import { useSlidingIndicator } from '../../hooks/useSlidingIndicator';

type PaletteMode = 'light' | 'dark';
type PaletteKey = keyof ThemePalette;

const activePaletteMode = (theme: 'system' | PaletteMode): PaletteMode =>
  theme === 'system'
    ? (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

const colorFields: Array<{ key: PaletteKey; label: string; description: string }> = [
  { key: 'accent', label: 'Accent', description: 'Buttons, progress, selection and focus.' },
  { key: 'background', label: 'App background', description: 'The outer application canvas.' },
  { key: 'surface', label: 'Surface', description: 'Cards, header, inputs and panels.' },
  { key: 'foreground', label: 'Primary text', description: 'Headings and important content.' },
  { key: 'secondaryText', label: 'Secondary text', description: 'Descriptions and metadata.' },
  { key: 'border', label: 'Borders', description: 'Dividers, outlines and table rules.' },
];

export function AppearanceEditor() {
  const currentTheme = settings.value?.theme || 'system';
  const [displayTheme, setDisplayTheme] = useState<'system' | PaletteMode>(currentTheme);
  const [animateSelection, setAnimateSelection] = useState(false);
  const [systemMode, setSystemMode] = useState<PaletteMode>(() => activePaletteMode('system'));
  const paletteMode = displayTheme === 'system' ? systemMode : displayTheme;
  const palette = getPalette(settings.value, paletteMode);
  const presets = paletteMode === 'light' ? lightPresets : darkPresets;
  const selectedPreset = paletteMode === 'light' ? settings.value?.lightPreset || 'frost' : settings.value?.darkPreset || 'midnight';
  const { containerRef: tabsRef, indicatorStyle } = useSlidingIndicator<HTMLDivElement>(displayTheme, animateSelection);

  useEffect(() => {
    setDisplayTheme(currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const preference = window.matchMedia('(prefers-color-scheme: dark)');
    const followSystem = () => setSystemMode(preference.matches ? 'dark' : 'light');
    followSystem();
    preference.addEventListener('change', followSystem);
    return () => preference.removeEventListener('change', followSystem);
  }, []);

  const updatePalette = async (next: ThemePalette, preset = 'custom') => {
    await updateSettings(paletteMode === 'light'
      ? { lightPalette: next, lightPreset: preset }
      : { darkPalette: next, darkPreset: preset });
  };

  const selectPreset = async (id: string) => {
    const preset = presets.find(item => item.id === id);
    if (preset) await updatePalette(preset.palette, preset.id);
  };

  const resetPalette = () => updatePalette(paletteMode === 'light' ? defaultLightPalette : defaultDarkPalette, paletteMode === 'light' ? 'frost' : 'midnight');

  const selectMode = (next: 'system' | PaletteMode) => {
    setAnimateSelection(true);
    setDisplayTheme(next);
    void updateSettings({ theme: next }).catch(() => setDisplayTheme(currentTheme));
  };

  return (
    <div className={styles.editor}>
      <div className={styles.paletteHeader}>
        <div ref={tabsRef} className={styles.tabs} role="tablist" aria-label="App mode">
          <span className={styles.tabIndicator} style={indicatorStyle} aria-hidden="true" data-testid="palette-tab-indicator" />
          <button role="tab" aria-selected={displayTheme === 'light'} data-selected={displayTheme === 'light'} className={displayTheme === 'light' ? styles.tabActive : ''} onClick={() => selectMode('light')}><Sun size={15} /> Light</button>
          <button role="tab" aria-selected={displayTheme === 'dark'} data-selected={displayTheme === 'dark'} className={displayTheme === 'dark' ? styles.tabActive : ''} onClick={() => selectMode('dark')}><Moon size={15} /> Dark</button>
          <button role="tab" aria-selected={displayTheme === 'system'} data-selected={displayTheme === 'system'} className={displayTheme === 'system' ? styles.tabActive : ''} onClick={() => selectMode('system')} title="Follow your browser's color scheme"><Monitor size={15} /> System</button>
        </div>
        <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={resetPalette}>Reset</Button>
      </div>

      <p className={styles.paletteHint}>{displayTheme === 'system' ? `Following your browser · editing ${paletteMode} colors` : `Editing ${paletteMode} colors`}</p>
      <section className={styles.paletteCard} aria-label={`${paletteMode} theme colors`}>
        <div className={styles.presetGrid}>
          {presets.map(preset => (
            <button key={preset.id} className={selectedPreset === preset.id ? styles.presetActive : ''} onClick={() => selectPreset(preset.id)} aria-pressed={selectedPreset === preset.id}>
              <span className={styles.swatches} aria-hidden="true">
                <i style={{ background: preset.palette.background }} />
                <i style={{ background: preset.palette.surface }} />
                <i style={{ background: preset.palette.accent }} />
              </span>
              <span>{preset.name}</span>
            </button>
          ))}
        </div>

        <div className={styles.colorList}>
          {colorFields.map(field => (
            <ColorField
              key={`${paletteMode}-${field.key}`}
              label={field.label}
              description={field.description}
              value={palette[field.key]}
              onChange={value => updatePalette({ ...palette, [field.key]: value })}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ColorField({ label, description, value, onChange }: { label: string; description: string; value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value.toUpperCase());
  useEffect(() => setDraft(value.toUpperCase()), [value]);

  const acceptDraft = (next: string) => {
    const normalized = next.startsWith('#') ? next : `#${next}`;
    setDraft(normalized.toUpperCase());
    if (/^#[0-9A-F]{6}$/i.test(normalized)) onChange(normalized.toLowerCase());
  };

  return <div className={styles.colorRow}>
    <label><strong>{label}</strong><span>{description}</span></label>
    <div className={styles.colorControl}>
      <input type="color" aria-label={`${label} color picker`} value={value} onInput={event => acceptDraft(event.currentTarget.value)} />
      <input aria-label={`${label} hex value`} value={draft} maxLength={7} spellcheck={false} onInput={event => acceptDraft(event.currentTarget.value)} onBlur={() => setDraft(value.toUpperCase())} />
    </div>
  </div>;
}
