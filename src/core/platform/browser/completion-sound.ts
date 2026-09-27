import { browser } from 'wxt/browser';
import { settingsStorage } from '../storage/storage-items';
import { getCompletionSound } from './completion-sounds';

const offscreenPath = '/offscreen.html';
let creating: Promise<void> | null = null;

const ensureOffscreen = async () => {
  if (!browser.offscreen?.createDocument) return false;
  if (!creating) {
    creating = (async () => {
      const url = browser.runtime.getURL(offscreenPath);
      const contexts = await browser.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [url],
      });
      if (contexts.length) return;
      await browser.offscreen.createDocument({
        url: offscreenPath,
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Play a brief sound when a NAS download completes.',
      });
    })().finally(() => { creating = null; });
  }
  await creating;
  return true;
};

export const completionSound = {
  async play() {
    try {
      const settings = await settingsStorage.getValue();
      if (settings.completionSoundEnabled === false) return;
      if (!await ensureOffscreen()) return;
      const sound = getCompletionSound(settings.completionSound);
      await browser.runtime.sendMessage({ target: 'completion-sound-offscreen', soundId: sound.id });
    } catch (error) {
      // A blocked or unavailable audio device must not interrupt task polling.
      console.warn('[R22E] Completion sound could not play:', error);
    }
  },
};
