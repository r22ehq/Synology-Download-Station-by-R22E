import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { SettingsBackup } from '../../../src/ui/components/SettingsBackup/SettingsBackup';
import { settingsStorage, profilesStorage } from '../../../src/core/platform/storage/storage-items';
import { notifications } from '../../../src/core/platform/browser/notifications';

vi.mock('../../../src/core/platform/storage/storage-items', () => ({
  settingsStorage: {
    getValue: vi.fn(),
    setValue: vi.fn(),
  },
  profilesStorage: {
    getValue: vi.fn(),
    setValue: vi.fn(),
  },
}));

vi.mock('../../../src/core/platform/browser/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

describe('SettingsBackup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:test-url');
    globalThis.URL.revokeObjectURL = vi.fn();
    
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  it('exports only safe configuration fields', async () => {
    vi.mocked(settingsStorage.getValue as any).mockResolvedValue({ theme: 'dark', secretKey: 'secret' } as any);
    vi.mocked(profilesStorage.getValue as any).mockResolvedValue([{
      id: 'p1',
      name: 'NAS 1',
      host: 'nas.com',
      port: 5000,
      protocol: 'http',
      username: 'admin',
      password: 'password123', // Should be omitted
      defaultDestination: '/downloads',
      sid: 'sensitive-sid', // Should be omitted
    }] as any);

    render(<SettingsBackup />);
    
    const exportBtn = screen.getByText('Export Settings');
    fireEvent.click(exportBtn);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
    const blobArg = vi.mocked(globalThis.URL.createObjectURL).mock.calls[0]?.[0] as Blob;
    
    // Read the blob text
    const text = await blobArg.text();
    const parsed = JSON.parse(text);
    
    expect(parsed.settings).toEqual({ theme: 'dark' });
    expect(parsed.settings.secretKey).toBeUndefined();
    
    expect(parsed.profiles).toHaveLength(1);
    expect(parsed.profiles[0]).toEqual({
      id: 'p1',
      name: 'NAS 1',
      host: 'nas.com',
      port: 5000,
      protocol: 'http',
      username: 'admin',
      defaultDestination: '/downloads',
    });
    
    expect(parsed.profiles[0].password).toBeUndefined();
    expect(parsed.profiles[0].sid).toBeUndefined();
  });

  it('validates and repairs malformed imported JSON structure safely', async () => {
    const maliciousJson = JSON.stringify({
      version: 1,
      settings: { theme: 'invalid_theme', __proto__: { hacked: true } },
      profiles: [
        { id: 'p1', name: 'NAS 1', host: 'nas.com', port: 'not a number', protocol: 'ftp' },
        null,
        "string",
      ]
    });

    const file = new File([maliciousJson], 'backup.json', { type: 'application/json' });
    
    render(<SettingsBackup />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file] });
    fireEvent.change(input);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(settingsStorage.setValue).not.toHaveBeenCalled(); // No valid settings
    expect(profilesStorage.setValue).toHaveBeenCalledWith([{
      id: 'p1',
      name: 'NAS 1',
      host: 'nas.com',
      port: 5000, // default fallback
      protocol: 'http', // default fallback
      username: '',
      defaultDestination: '',
    }]);
    
    expect(notifications.show).toHaveBeenCalledWith('import-success', expect.any(String), expect.any(String));
  });

  it('rejects duplicate profile IDs in backup', async () => {
    const invalidJson = JSON.stringify({
      version: 1,
      profiles: [
        { id: 'p1', name: 'NAS 1' },
        { id: 'p1', name: 'NAS 1 Dupe' } // Duplicate
      ]
    });
    const file = new File([invalidJson], 'backup.json', { type: 'application/json' });
    render(<SettingsBackup />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file] });
    fireEvent.change(input);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(profilesStorage.setValue).not.toHaveBeenCalled();
    expect(notifications.show).toHaveBeenCalledWith('import-error', expect.any(String), expect.stringContaining('Duplicate profile IDs'));
  });

  it('rolls back completely if a write fails', async () => {
    const goodJson = JSON.stringify({ version: 1, settings: { theme: 'dark' }, profiles: [{ id: 'p1' }] });
    const file = new File([goodJson], 'backup.json', { type: 'application/json' });
    
    vi.mocked(settingsStorage.getValue as any).mockResolvedValue({ theme: 'light' });
    vi.mocked(profilesStorage.getValue as any).mockResolvedValue([]);
    
    // Simulate settings success, but profiles failure
    vi.mocked(settingsStorage.setValue as any).mockResolvedValue();
    vi.mocked(profilesStorage.setValue as any).mockRejectedValueOnce(new Error('Storage quota exceeded')).mockResolvedValue();
    
    render(<SettingsBackup />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file] });
    fireEvent.change(input);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Check that rollback occurred (we set back the old values)
    expect(settingsStorage.setValue).toHaveBeenCalledWith({ theme: 'light' });
    expect(profilesStorage.setValue).toHaveBeenCalledWith([]);
    expect(notifications.show).toHaveBeenCalledWith('import-error', expect.any(String), expect.stringContaining('Atomic write failed'));
  });

  it('rejects unsupported versions without mutating state', async () => {
    const invalidJson = JSON.stringify({ version: 999, settings: {} });
    const file = new File([invalidJson], 'backup.json', { type: 'application/json' });
    
    render(<SettingsBackup />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file] });
    fireEvent.change(input);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(settingsStorage.setValue).not.toHaveBeenCalled();
    expect(profilesStorage.setValue).not.toHaveBeenCalled();
    expect(notifications.show).toHaveBeenCalledWith('import-error', expect.any(String), expect.any(String));
  });
});
