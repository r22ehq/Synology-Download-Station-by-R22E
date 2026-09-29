import { useEffect, useState } from 'preact/hooks';
import { activeProfile, updateProfile } from '../../state/app-state';
import { sendMessage } from '@/core/platform/messaging/message-contracts';
import { backgroundErrorMessage, readFromBackground } from '@/core/platform/messaging/background-request';
import type { DownloadStationConfig, SpeedLimits } from '@/core/synology/download-station/types';
import { speedLimitFields, validateSpeedLimits } from '@/core/domain/validation/speed-limits';
import { Button } from '../Button/Button';
import { Input } from '../Input/Input';
import { DestinationBrowser } from '../DestinationBrowser/DestinationBrowser';
import styles from './DownloadPreferences.module.css';

const speedFields = [
  { key: 'bt_max_download', label: 'BitTorrent download' },
  { key: 'bt_max_upload', label: 'BitTorrent upload' },
  { key: 'http_max_download', label: 'HTTP / FTP download' },
  { key: 'nzb_max_download', label: 'NZB download' },
] as const;
type RateValues = Record<typeof speedLimitFields[number], string>;
const readRates = (config: DownloadStationConfig): RateValues => ({
  bt_max_download: String(config.bt_max_download), bt_max_upload: String(config.bt_max_upload),
  http_max_download: String(config.http_max_download ?? config.ftp_max_download ?? 0),
  nzb_max_download: String(config.nzb_max_download ?? 0),
});

export function DownloadPreferences({ section }: { section: 'location' | 'speed' }) {
  const profile = activeProfile.value;
  const profileId = profile?.id;
  const [destination, setDestination] = useState(profile?.defaultDestination || '');
  const [preferences, setPreferences] = useState<{ config: DownloadStationConfig; isManager: boolean } | null>(null);
  const [rates, setRates] = useState<RateValues>({ bt_max_download: '', bt_max_upload: '', http_max_download: '', nzb_max_download: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setDestination(activeProfile.value?.defaultDestination || ''); setPreferences(null); setMessage(null); setLoading(Boolean(profileId));
    if (profileId) void readFromBackground(() => sendMessage('nas:preferences', undefined)).then(result => {
      if (cancelled || result.profileId !== profileId) return;
      setPreferences(result); setRates(readRates(result.config));
    }).catch(error => {
      if (!cancelled) setMessage({ error: true, text: backgroundErrorMessage(error, 'Could not load NAS settings. Sign in and try again.') });
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [profileId, section, reloadKey]);

  const save = async () => {
    if (!profileId) return;
    setSaving(true); setMessage(null);
    try {
      if (activeProfile.value?.id !== profileId) throw new Error('The active NAS changed. Reload its settings.');
      if (section === 'location') {
        await updateProfile(profileId, { defaultDestination: destination || undefined });
        if (activeProfile.value?.id === profileId) setMessage({ error: false, text: 'Location saved for this NAS profile.' });
      } else {
        if (Object.values(rates).some(value => !/^\d+$/.test(value.trim()))) throw new Error('Enter a whole number of KB/s, or 0 for unlimited.');
        const limits = Object.fromEntries(speedLimitFields.map(key => [key, Number(rates[key])])) as SpeedLimits;
        validateSpeedLimits(limits);
        const result = await sendMessage('nas:speed', { profileId, limits });
        if (activeProfile.value?.id !== profileId) return;
        setRates(readRates(result.config)); setPreferences({ config: result.config, isManager: true });
        setMessage({ error: false, text: 'Speed limits saved on your NAS.' });
      }
    } catch (error) {
      if (activeProfile.value?.id === profileId) setMessage({ error: true, text: backgroundErrorMessage(error, 'Could not save. Try again.') });
    } finally { setSaving(false); }
  };

  return <div>
    <div className={styles.heading}><h2>{section === 'location' ? 'Location' : 'Speed'}</h2><p>{section === 'location' ? 'Choose where new downloads from this extension are saved.' : 'Set Download Station speed limits in KB/s. Use 0 for unlimited.'}</p></div>
    {!profile ? <p className={styles.hint}>Add a NAS profile first.</p> : <>
      <p className={styles.profile}>NAS: <strong>{profile.name}</strong></p>
      {loading && <p className={styles.hint} role="status">Loading NAS settings…</p>}
      {section === 'location' ? <div className={styles.card}>
        <label className={styles.defaultChoice}><input type="checkbox" checked={!destination} onChange={event => setDestination(event.currentTarget.checked ? '' : profile.defaultDestination || preferences?.config.default_destination || '')} /><span>Use Download Station default<small>{preferences?.config.default_destination || 'Follow the destination set on your NAS.'}</small></span></label>
        <p className={styles.selected}>Selected: <strong>{destination || 'Download Station default'}</strong></p>
        <DestinationBrowser key={profileId} defaultDestination={destination} onSelect={setDestination} />
        <p className={styles.hint}>This applies to new downloads from this extension only. Existing downloads and NAS settings stay unchanged.</p>
      </div> : preferences ? <div className={styles.card}>
        {!preferences.isManager && <p className={styles.hint}>Your account can view these limits. An administrator is required to change them.</p>}
        <fieldset className={styles.rates} disabled={!preferences.isManager || saving}>
          {speedFields.map(field => <Input key={field.key} id={`speed-${field.key}`} label={`${field.label} (KB/s)`} type="number" min="0" step="1" value={rates[field.key]} onInput={event => { const value = event.currentTarget.value; setRates(values => ({ ...values, [field.key]: value })); }} />)}
        </fieldset>
        <p className={styles.hint}>These are NAS-wide limits, not per-download limits. HTTP / FTP changes apply to new or resumed downloads.</p>
      </div> : null}
      {message && <p className={message.error ? styles.error : styles.success} role="status">{message.text}</p>}
      <div className={styles.actions}><Button variant="secondary" size="sm" onClick={() => setReloadKey(key => key + 1)} disabled={loading || saving}>Reload</Button><Button size="sm" onClick={save} isLoading={saving} disabled={loading || (section === 'speed' && !preferences?.isManager)}>Save {section === 'location' ? 'location' : 'speed limits'}</Button></div>
    </>}
  </div>;
}
