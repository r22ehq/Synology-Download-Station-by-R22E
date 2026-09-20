import { browser } from 'wxt/browser';

export function useI18n() {
  return {
    t: (key: string, substitutions?: string | string[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return browser.i18n.getMessage(key as any, substitutions) || key;
    }
  };
}
