import { readFile } from 'node:fs/promises';
import process from 'node:process';

const [filePath] = process.argv.slice(2);
const { CWS_ACCESS_TOKEN: token, CWS_PUBLISHER_ID: publisherId, CWS_EXTENSION_ID: extensionId } = process.env;
if (!filePath || !token || !publisherId || !extensionId) {
  throw new Error('A Chrome ZIP, CWS_ACCESS_TOKEN, CWS_PUBLISHER_ID, and CWS_EXTENSION_ID are required.');
}
if (!/^[a-z0-9_-]+$/i.test(publisherId) || !/^[a-p]{32}$/.test(extensionId)) {
  throw new Error('Invalid Chrome Web Store publisher or extension ID.');
}

const itemPath = `publishers/${publisherId}/items/${extensionId}`;
const apiBase = 'https://chromewebstore.googleapis.com';
const request = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const body = await response.text();
  let data;
  try { data = body ? JSON.parse(body) : {}; } catch { data = { message: body }; }
  if (!response.ok) {
    throw new Error(`Chrome Web Store API returned ${response.status}: ${JSON.stringify(data).slice(0, 1500)}`);
  }
  return data;
};

const upload = await request(`${apiBase}/upload/v2/${itemPath}:upload`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/zip' },
  body: await readFile(filePath),
});
console.warn(`Upload state: ${upload.uploadState || 'not reported'}; version: ${upload.crxVersion || 'processing'}`);

let state = upload.uploadState;
for (let attempt = 0; state === 'IN_PROGRESS' && attempt < 18; attempt++) {
  await new Promise(resolve => setTimeout(resolve, 5000));
  const status = await request(`${apiBase}/v2/${itemPath}:fetchStatus`);
  state = status.lastAsyncUploadState;
  console.warn(`Upload processing: ${state}`);
}
if (state !== 'SUCCEEDED') {
  throw new Error(`Chrome Web Store upload did not succeed: ${state || 'unknown state'}`);
}

const published = await request(`${apiBase}/v2/${itemPath}:publish`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ publishType: 'DEFAULT_PUBLISH', skipReview: false, blockOnWarnings: true }),
});
console.warn(`Submitted to Chrome Web Store. State: ${published.state || 'unknown'}`);
