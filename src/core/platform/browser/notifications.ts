import { browser } from 'wxt/browser';

class NotificationManager {
  private recentNotifications: Set<string> = new Set();
  
  public async show(id: string, title: string, message: string) {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      iconUrl: browser.runtime.getURL('/icon/128.png' as any),
      title,
      message,
    });
  }
}

export const notifications = new NotificationManager();
