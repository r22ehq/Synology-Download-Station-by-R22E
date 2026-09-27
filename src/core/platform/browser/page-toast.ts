import { browser } from 'wxt/browser';

const displayName = (uri: string) => {
  if (uri.startsWith('magnet:')) return 'Magnet link';
  try {
    const url = new URL(uri);
    const name = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || url.host);
    return name.slice(0, 100);
  } catch {
    return uri.slice(0, 100);
  }
};

/** A transient page-level acknowledgement for a context-menu action. */
export async function showPageToast(tabId: number | undefined, uri: string, success: boolean): Promise<void> {
  if (tabId === undefined) return;
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      args: [displayName(uri), success],
      func: (name: string, added: boolean) => {
        const previous = document.getElementById('r22e-page-toast');
        previous?.remove();

        const host = document.createElement('div');
        host.id = 'r22e-page-toast';
        host.dir = 'ltr';
        host.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483647;pointer-events:none;';
        const shadow = host.attachShadow({ mode: 'closed' });
        const style = document.createElement('style');
        style.textContent = `
          @keyframes enter { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
          .card { box-sizing: border-box; display: grid; grid-template-columns: 18px minmax(0, 1fr); gap: 9px; width: min(282px, calc(100vw - 32px)); padding: 10px 12px; border: 1px solid #d5d9df; border-radius: 9px; background: #fff; color: #20242a; box-shadow: 0 6px 20px rgba(16,24,40,.13); direction: ltr; text-align: left; font: 12px/1.35 system-ui, sans-serif; pointer-events: auto; animation: enter 170ms ease-out both; }
          .mark { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; background: #21865d; color: #fff; font-size: 12px; font-weight: 700; line-height: 1; }
          .card.error .mark { background: #b44b4b; }
          .copy { min-width: 0; }
          .title { font-size: 12px; font-weight: 650; }
          .name { margin-top: 2px; color: #59616c; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 11px; }
          @media (prefers-color-scheme: dark) { .card { border-color: #3b414b; background: #252a31; color: #f5f6f8; box-shadow: 0 6px 20px rgba(0,0,0,.22); } .name { color: #aeb6c2; } }
          @media (prefers-reduced-motion: reduce) { .card { animation: none; } }
        `;
        const card = document.createElement('div');
        card.className = added ? 'card' : 'card error';
        card.setAttribute('role', 'status');
        const mark = document.createElement('span');
        mark.className = 'mark';
        mark.textContent = added ? '✓' : '!';
        const copy = document.createElement('div');
        copy.className = 'copy';
        const title = document.createElement('div');
        title.className = 'title';
        title.textContent = added ? 'Added to Download Station' : 'Could not add download';
        const label = document.createElement('div');
        label.className = 'name';
        label.textContent = name;
        copy.append(title, label);
        card.append(mark, copy);
        shadow.append(style, card);
        document.documentElement.append(host);
        window.setTimeout(() => host.remove(), 4200);
      },
    });
  } catch {
    // Protected browser pages and pages without injection permission cannot show an in-page toast.
  }
}
