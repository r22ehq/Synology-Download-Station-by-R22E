import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/preact';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { SettingsView } from '../../../src/ui/components/SettingsView/SettingsView';
import { currentView } from '../../../src/ui/state/navigation';
import { PermissionsManager } from '../../../src/core/platform/browser/permissions';
import * as browserAdapter from '../../../src/core/platform/browser/browser-adapter';
import { testConnection } from '../../../src/ui/utils/connection-tester';
import { sendMessage } from '../../../src/core/platform/messaging/message-contracts';

vi.mock('../../../src/core/platform/messaging/message-contracts', () => ({ sendMessage: vi.fn() }));
vi.mock('../../../src/ui/utils/connection-tester', () => ({ testConnection: vi.fn() }));

describe('Connection setup permission step', () => {
  let allowed: boolean;
  let draft: Record<string, unknown>;

  beforeEach(() => {
    allowed = false;
    draft = {};
    currentView.value = 'add_nas';
    vi.spyOn(PermissionsManager, 'hasHostPermission').mockImplementation(async () => allowed);
    vi.spyOn(PermissionsManager, 'requestHostPermissions').mockImplementation(async () => {
      expect((screen.getByLabelText('Username') as HTMLInputElement).disabled).toBe(true);
      expect((screen.getByLabelText('Password') as HTMLInputElement).disabled).toBe(true);
      allowed = true;
      return true;
    });
    vi.mocked(browser.storage.session.get).mockImplementation(async () => draft);
    vi.mocked(browser.storage.session.set).mockImplementation(async value => { draft = value; });
    vi.mocked(testConnection).mockResolvedValue({ success: true, diagnostic: 'Connection successful.' });
    vi.mocked(sendMessage).mockResolvedValue({ success: true });
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

  const openSetup = async () => {
    render(<SettingsView onAddNas={() => {}} />);
    await waitFor(() => expect(browser.storage.session.get).toHaveBeenCalled());
  };

  it('defaults to HTTP and requests access before credentials, never during Test', async () => {
    await openSetup();
    const savePassword = screen.getByRole('checkbox', { name: /Save password on this device/ });
    expect(savePassword.closest('label')?.textContent).toContain('Recommended');
    expect(savePassword.closest('label')?.textContent).toContain('automatic sign-in when your NAS expires the session');
    expect(screen.getByRole('button', { name: /Local HTTP\s*Port 5000/ }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.input(screen.getByLabelText('NAS address'), { target: { value: 'http://nas.test:5000' } });
    await waitFor(() => expect(draft).toHaveProperty('nasSetupAddress'));
    expect(PermissionsManager.requestHostPermissions).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Allow NAS access' }));
    await waitFor(() => expect((screen.getByLabelText('Username') as HTMLInputElement).disabled).toBe(false));
    fireEvent.input(screen.getByLabelText('Username'), { target: { value: 'mock-user' } });
    fireEvent.input(screen.getByLabelText('Password'), { target: { value: 'mock-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    await waitFor(() => expect(testConnection).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Save and connect' }));
    await waitFor(() => expect(sendMessage).toHaveBeenCalledWith('auth:login', expect.objectContaining({ account: 'mock-user' })));
    expect(PermissionsManager.requestHostPermissions).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(draft)).not.toContain('mock-password');
    expect(JSON.stringify(draft)).not.toContain('mock-user');
  });

  it('retains the address after a popup closes without saving credential fields', async () => {
    await openSetup();
    fireEvent.input(screen.getByLabelText('NAS address'), { target: { value: 'https://nas.test:5001' } });
    await waitFor(() => expect(JSON.stringify(draft)).toContain('https://nas.test:5001'));
    cleanup();
    allowed = true;
    await openSetup();
    await waitFor(() => expect((screen.getByLabelText('NAS address') as HTMLInputElement).value).toBe('https://nas.test:5001'));
    await waitFor(() => expect((screen.getByLabelText('Username') as HTMLInputElement).disabled).toBe(false));
    expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('');
    expect(screen.getByRole('button', { name: /Local HTTPS/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('dismisses the Firefox action popup while a host grant is pending', async () => {
    vi.spyOn(browserAdapter, 'getBrowserInfo').mockReturnValue({ name: 'firefox', isChromium: false });
    const close = vi.spyOn(window, 'close').mockImplementation(() => {});
    vi.mocked(PermissionsManager.requestHostPermissions).mockImplementation(() => new Promise(() => {}));
    render(<SettingsView onAddNas={() => {}} inActionPopup />);
    await waitFor(() => expect(browser.storage.session.get).toHaveBeenCalled());
    fireEvent.input(screen.getByLabelText('NAS address'), { target: { value: 'http://nas.test:5000' } });
    await waitFor(() => expect(JSON.stringify(draft)).toContain('http://nas.test:5000'));
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Allow NAS access' }));
    expect(PermissionsManager.requestHostPermissions).toHaveBeenCalledWith(['http://nas.test:5000']);
    await vi.advanceTimersByTimeAsync(251);
    expect(close).toHaveBeenCalledOnce();
    expect(draft).toHaveProperty('nasSetupResumeAfterPermission', true);
    expect(JSON.stringify(draft)).not.toContain('mock-password');
  });

  it('keeps credentials disabled when access is denied and never tests the NAS', async () => {
    vi.mocked(PermissionsManager.requestHostPermissions).mockResolvedValue(false);
    await openSetup();
    fireEvent.input(screen.getByLabelText('NAS address'), { target: { value: 'http://nas.test:5000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Allow NAS access' }));
    await screen.findByText('NAS access was not allowed. Try again before entering your credentials.');
    expect((screen.getByLabelText('Username') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('NAS address') as HTMLInputElement).value).toBe('http://nas.test:5000');
    expect(testConnection).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('shows an authentication failure without mislabeling it as an unreachable NAS', async () => {
    allowed = true;
    vi.mocked(testConnection).mockResolvedValue({ success: false, authenticationError: true, diagnostic: 'Incorrect username or password. Check your NAS credentials and try again.' });
    await openSetup();
    fireEvent.input(screen.getByLabelText('NAS address'), { target: { value: 'http://nas.test:5000' } });
    await waitFor(() => expect((screen.getByLabelText('Username') as HTMLInputElement).disabled).toBe(false));
    fireEvent.input(screen.getByLabelText('Username'), { target: { value: 'mock-user' } });
    fireEvent.input(screen.getByLabelText('Password'), { target: { value: 'mock-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    await screen.findByText('Incorrect username or password. Check your NAS credentials and try again.');
    expect(screen.queryByText(/NAS could not be reached/)).toBeNull();
  });
});
