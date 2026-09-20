export type LinkType = 'http' | 'magnet' | 'ed2k' | 'torrent' | 'unknown';

export class UrlValidator {
  public static isValidHttpUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  public static isMagnetLink(url: string): boolean {
    return url.trim().toLowerCase().startsWith('magnet:');
  }

  public static isEd2kLink(url: string): boolean {
    return url.trim().toLowerCase().startsWith('ed2k://');
  }

  public static isTorrentFile(filename: string): boolean {
    return filename.trim().toLowerCase().endsWith('.torrent');
  }

  public static classifyLink(url: string): LinkType {
    const trimmed = url.trim();
    if (this.isMagnetLink(trimmed)) return 'magnet';
    if (this.isEd2kLink(trimmed)) return 'ed2k';
    if (this.isTorrentFile(trimmed)) return 'torrent';
    if (this.isValidHttpUrl(trimmed)) return 'http';
    return 'unknown';
  }

  public static parseDownloadLinks(input: string): string[] {
    if (!input) return [];

    return input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((line) => this.classifyLink(line) !== 'unknown');
  }
}
