import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from '../../../src/../entrypoints/prompt/App';
import { browser } from 'wxt/browser';
import { sendMessage } from '../../../src/core/platform/messaging/message-contracts';

vi.mock('wxt/browser', () => ({
  browser: {
    permissions: {
      request: vi.fn(),
    },
  },
}));

vi.mock('../../../src/core/platform/messaging/message-contracts', () => ({
  sendMessage: vi.fn(),
}));

describe('Permission Prompt UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock window.close
    vi.stubGlobal('close', vi.fn());
    
    // Mock URLSearchParams
    const mockSearch = '?url=https%3A%2F%2Ftracker.example.com%2Ffile.torrent&origin=https%3A%2F%2Ftracker.example.com%2F%2A';
    Object.defineProperty(window, 'location', {
      value: { search: mockSearch },
      writable: true,
    });
  });

  it('user explicitly choosing "Send URL directly anyway"', async () => {
    render(<App />);

    const sendDirectBtn = await screen.findByText('Send URL directly anyway');
    fireEvent.click(sendDirectBtn);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(sendMessage).toHaveBeenCalledWith('tasks:create', { 
      uri: 'https://tracker.example.com/file.torrent', 
      forceDirect: true 
    });
    expect(window.close).toHaveBeenCalled();
  });

  it('user grants access successfully', async () => {
    vi.mocked(browser.permissions.request as any).mockResolvedValue(true);
    
    render(<App />);
    const grantBtn = await screen.findByText('Grant Access');
    fireEvent.click(grantBtn);

    // Wait for async request
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(browser.permissions.request).toHaveBeenCalledWith({ origins: ['https://tracker.example.com/*'] });
    expect(sendMessage).toHaveBeenCalledWith('tasks:create', { 
      uri: 'https://tracker.example.com/file.torrent' 
    });
    expect(window.close).toHaveBeenCalled();
  });
});
