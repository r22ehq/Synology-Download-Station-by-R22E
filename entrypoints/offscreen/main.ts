import { browser } from 'wxt/browser';
import { getCompletionSound } from '@/core/platform/browser/completion-sounds';

browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!message || typeof message !== 'object' || !('target' in message) || message.target !== 'completion-sound-offscreen') return;
  const soundId = 'soundId' in message ? message.soundId : undefined;
  const sound = getCompletionSound(soundId);
  const audio = new Audio(browser.runtime.getURL(`/${sound.file}`));
  audio.volume = 0.75;
  void audio.play().then(
    () => sendResponse({ played: true }),
    () => sendResponse({ played: false }),
  );
  return true;
});
