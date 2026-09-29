import { beforeEach, describe, expect, it, vi } from 'vitest';

const { settings, createDocument, getContexts, sendMessage, offscreen } = vi.hoisted(() => {
  const createDocument = vi.fn().mockResolvedValue(undefined);
  return {
    settings: { completionSoundEnabled: true, completionSound: 'soft' },
    createDocument,
    offscreen: { createDocument } as { createDocument: typeof createDocument | undefined },
    getContexts: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn().mockResolvedValue({ played: true }),
  };
});

vi.mock('wxt/browser', () => ({
  browser: {
    offscreen,
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
    vi.unstubAllGlobals();
    offscreen.createDocument = createDocument;
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

  it('plays directly in the Firefox background document without offscreen APIs', async () => {
    offscreen.createDocument = undefined;
    const play = vi.fn().mockResolvedValue(undefined);
    const AudioMock = vi.fn(function () { return { play, volume: 0 }; });
    vi.stubGlobal('Audio', AudioMock);
    settings.completionSound = 'glass';
    await completionSound.play();
    expect(AudioMock).toHaveBeenCalledWith('chrome-extension://example/completion-glass.wav');
    expect(play).toHaveBeenCalledOnce();
    expect(createDocument).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('does not fail polling when Firefox blocks audio playback', async () => {
    offscreen.createDocument = undefined;
    vi.stubGlobal('Audio', vi.fn(function () {
      return { play: vi.fn().mockRejectedValue(new Error('Autoplay blocked')), volume: 0 };
    }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(completionSound.play()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
