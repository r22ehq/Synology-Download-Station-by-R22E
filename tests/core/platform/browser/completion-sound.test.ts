import { beforeEach, describe, expect, it, vi } from 'vitest';

const { settings, createDocument, getContexts, sendMessage } = vi.hoisted(() => ({
  settings: { completionSoundEnabled: true, completionSound: 'soft' },
  createDocument: vi.fn().mockResolvedValue(undefined),
  getContexts: vi.fn().mockResolvedValue([]),
  sendMessage: vi.fn().mockResolvedValue({ played: true }),
}));

vi.mock('wxt/browser', () => ({
  browser: {
    offscreen: { createDocument },
    runtime: {
      getURL: (path: string) => `chrome-extension://example${path}`,
      getContexts,
      sendMessage,
    },
  },
}));
vi.mock('../../../../src/core/platform/storage/storage-items', () => ({
  settingsStorage: { getValue: vi.fn(async () => settings) },
}));

import { completionSound } from '../../../../src/core/platform/browser/completion-sound';

describe('completionSound', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settings.completionSoundEnabled = true;
    settings.completionSound = 'soft';
    getContexts.mockResolvedValue([]);
  });

  it('does not create an audio document when the user disables the sound', async () => {
    settings.completionSoundEnabled = false;
    await completionSound.play();
    expect(createDocument).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('plays the selected sound through an offscreen document', async () => {
    settings.completionSound = 'glass';
    await completionSound.play();
    expect(createDocument).toHaveBeenCalledWith(expect.objectContaining({ reasons: ['AUDIO_PLAYBACK'] }));
    expect(sendMessage).toHaveBeenCalledWith({ target: 'completion-sound-offscreen', soundId: 'glass' });
  });

  it('reuses an existing offscreen document', async () => {
    getContexts.mockResolvedValue([{ contextType: 'OFFSCREEN_DOCUMENT' }]);
    await completionSound.play();
    expect(createDocument).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledOnce();
  });
});
