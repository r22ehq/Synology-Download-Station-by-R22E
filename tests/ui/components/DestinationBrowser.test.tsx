import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DestinationBrowser } from '../../../src/ui/components/DestinationBrowser/DestinationBrowser';
import { sendMessage } from '../../../src/core/platform/messaging/message-contracts';

vi.mock('../../../src/core/platform/messaging/message-contracts', () => ({
  sendMessage: vi.fn(),
}));

describe('DestinationBrowser', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render root folders initially', async () => {
    vi.mocked(sendMessage).mockResolvedValueOnce({
      folders: [
        { id: '/video', name: 'video', path: '/video' },
        { id: '/downloads', name: 'downloads', path: '/downloads' },
      ]
    });

    render(<DestinationBrowser onSelect={mockOnSelect} defaultDestination="/default" />);

    // Shows loading initially, but we wait for folders
    expect(await screen.findByText('video')).toBeDefined();
    expect(await screen.findByText('downloads')).toBeDefined();
    
    // Breadcrumb 'Root' should be visible
    expect(screen.getByText('Root')).toBeDefined();
  });

  it('should handle nested navigation', async () => {
    vi.mocked(sendMessage)
      .mockResolvedValueOnce({
        folders: [{ id: '/downloads', name: 'downloads', path: '/downloads' }]
      })
      .mockResolvedValueOnce({
        folders: [{ id: '/downloads/movies', name: 'movies', path: '/downloads/movies' }]
      });

    render(<DestinationBrowser onSelect={mockOnSelect} />);

    // Wait for root
    const downloadsFolder = await screen.findByText('downloads');
    
    // Click into downloads
    fireEvent.click(downloadsFolder);
    
    // Wait for nested folder
    expect(await screen.findByText('movies')).toBeDefined();
    
    // Breadcrumb should show nested path
    expect(screen.getByText('downloads')).toBeDefined();
  });

  it('should show fallback UI when permission denied or NAS unreachable', async () => {
    vi.mocked(sendMessage).mockRejectedValueOnce(new Error('Permission denied'));

    render(<DestinationBrowser onSelect={mockOnSelect} defaultDestination="/default/fallback" />);

    expect(await screen.findByText('Permission denied')).toBeDefined();
    expect(screen.getByText('You can still use the default destination or enter a path manually.')).toBeDefined();
    
    const fallbackBtn = screen.getByText('Use Default (/default/fallback)');
    fireEvent.click(fallbackBtn);
    
    expect(mockOnSelect).toHaveBeenCalledWith('/default/fallback');
  });

  it('should handle empty folders gracefully', async () => {
    vi.mocked(sendMessage).mockResolvedValueOnce({ folders: [] });

    render(<DestinationBrowser onSelect={mockOnSelect} />);

    // Wait for fetch to complete. No items but no error.
    await waitFor(() => {
      expect(screen.queryByText('Permission denied')).toBeNull();
    });
    
    // Breadcrumb still there
    expect(screen.getByText('Root')).toBeDefined();
  });
});
