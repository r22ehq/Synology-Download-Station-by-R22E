import { browser } from 'wxt/browser';
import { settingsStorage } from '../storage/storage-items';

class NotificationManager {
  private recentNotifications: Set<string> = new Set();
  
  public async show(id: string, title: string, message: string) {
    const settings = await settingsStorage.getValue();
    if (!settings.notificationsEnabled) return;

    // Deduplicate notifications
    const dedupeKey = `${id}:${title}:${message}`;
    if (this.recentNotifications.has(dedupeKey)) return;
    
    this.recentNotifications.add(dedupeKey);
    setTimeout(() => {
      this.recentNotifications.delete(dedupeKey);
    }, 60000); // 1 minute deduplication window
    
    const hasPermission = await browser.permissions.contains({ permissions: ['notifications'] });
    if (!hasPermission) return;
    
    await browser.notifications.create(id, {
      type: 'basic',
      iconUrl: browser.runtime.getURL('/icon-128.png'),
      title,
      message,
    });
  }
}

export const notifications = new NotificationManager();
