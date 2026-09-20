
export interface TorrentDownloadResult {
  file: File;
  fileName: string;
}

export class TorrentDownloader {
  /**
   * Fetches a torrent file from a given URL using the browser's credentials (cookies).
   * Verifies the response is actually a torrent file.
   */
  async fetchTorrent(url: string): Promise<TorrentDownloadResult> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        // In MV3, omitting credentials will not send cookies. We MUST include them for private trackers.
        // If we don't set it, default is 'same-origin', but in extension background scripts 'include' is needed for cross-origin tracking cookies
        credentials: 'include',
      });
      
      // If we got redirected to a login page
      if (response.url.includes('login') || response.url.includes('signin')) {
        throw new Error('Redirected to login page. Tracker session may have expired.');
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch torrent: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      
      // Check for HTML response (e.g. Cloudflare challenge or login page)
      if (contentType.includes('text/html')) {
        throw new Error('Received HTML instead of a torrent file. You may need to log in to the tracker.');
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Bencode dictionaries start with 'd'. 
      // Most torrent files start with 'd8:announce' or 'd4:info'
      if (bytes.length === 0 || bytes[0] !== 0x64) { // 0x64 is 'd'
        throw new Error('Invalid torrent file format. Missing bencode dictionary header.');
      }

      // Extract filename from content-disposition if possible
      let fileName = 'download.torrent';
      const disposition = response.headers.get('content-disposition');
      if (disposition && disposition.includes('filename=')) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches !== null && matches[1]) {
          fileName = matches[1].replace(/['"]/g, '');
        }
      } else {
        // Try to get from URL
        const urlObj = new URL(response.url);
        const pathSegments = urlObj.pathname.split('/');
        const lastSegment = pathSegments[pathSegments.length - 1];
        if (lastSegment && lastSegment.endsWith('.torrent')) {
          fileName = lastSegment;
        }
      }

      const file = new File([blob], fileName, { type: 'application/x-bittorrent' });
      return { file, fileName };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error fetching torrent', { cause: error });
    }
  }
}
