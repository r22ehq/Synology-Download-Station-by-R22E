import { browser } from 'wxt/browser';

const MENU_DOWNLOAD_LINK = 'r22e-download-link';
const MENU_SCRAPE_PAGE = 'r22e-scrape-page';

export interface ContextMenuPreferences {
  downloadEnabled: boolean;
  scrapeEnabled: boolean;
}

export class ContextMenuManager {
  public static async registerMenus(preferences: ContextMenuPreferences = { downloadEnabled: true, scrapeEnabled: true }) {
    try {
      await browser.contextMenus.removeAll();

      if (preferences.downloadEnabled) {
        browser.contextMenus.create({
          id: MENU_DOWNLOAD_LINK,
          title: browser.i18n.getMessage('contextMenuDownload') || 'Download with Synology DS',
          contexts: ['link', 'image', 'video', 'audio', 'selection'],
        });
      }

      if (preferences.scrapeEnabled) {
        browser.contextMenus.create({
          id: MENU_SCRAPE_PAGE,
          title: browser.i18n.getMessage('contextMenuScrape') || 'Scrape page for downloads',
          contexts: ['page'],
        });
      }
    } catch (e) {
      console.error('Failed to register context menus', e);
    }
  }
}
