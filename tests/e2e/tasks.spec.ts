import { test, expect } from './fixtures/extension';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { addMockNasAndConnect } from './fixtures/setup-flow';

declare const chrome: { runtime: {
  getContexts: (options: { contextTypes: string[] }) => Promise<Array<{ contextType: string }>>;
  sendMessage: (message: { target: string; soundId: string }) => Promise<{ played: boolean }>;
} };

test.describe('Task Creation', () => {
  test.beforeEach(async ({ page, gotoPopup, mockNas }) => {
    mockNas.state.authStatus = 'SUCCESS';
    await gotoPopup(page);
    await addMockNasAndConnect(page, mockNas);
    await expect(page.getByPlaceholder(/Paste URL/i)).toBeVisible({ timeout: 10000 });
  });

  test('creates task from URL', async ({ page, gotoPopup }) => {
    await gotoPopup(page);
    await page.getByPlaceholder(/Paste URL/i).fill('http://example.com/file.zip');
    await page.getByRole('button', { name: 'Add URL download' }).click();
    await expect(page.getByPlaceholder(/Paste URL/i)).toBeVisible();
  });

  test('creates task from magnet', async ({ page, gotoPopup }) => {
    await gotoPopup(page);
    await page.getByPlaceholder(/Paste URL/i).fill('magnet:?xt=urn:btih:12345');
    await page.getByRole('button', { name: 'Add URL download' }).click();
    await expect(page.getByPlaceholder(/Paste URL/i)).toBeVisible();
  });

  test('uses one refresh control with clear progress and completion feedback', async ({ page, gotoPopup }) => {
    await gotoPopup(page);
    const refresh = page.getByRole('button', { name: 'Refresh tasks' });
    await expect(refresh).toHaveCount(1);
    await refresh.click();
    await expect(page.getByRole('button', { name: 'Refreshing tasks' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tasks refreshed' })).toBeVisible({ timeout: 5000 });
  });

  test('opens the audio document only when a known task completes', async ({ page, mockNas }) => {
    const task = {
      id: 'completion-sound-task', title: 'Completed audio test.zip', status: 'downloading' as const, size: 1024,
      type: 'http' as const, username: 'admin',
      additional: { transfer: { size_downloaded: 512, size_uploaded: 0, speed_download: 64, speed_upload: 0 } },
    };
    mockNas.state.tasks = [task];
    await page.getByRole('button', { name: 'Refresh tasks' }).click();
    await expect(page.getByText('Completed audio test.zip')).toBeVisible();
    expect(await page.evaluate(() => chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] }))).toHaveLength(0);

    mockNas.state.tasks = [{ ...task, status: 'finished' }];
    await page.getByRole('button', { name: 'Refresh tasks' }).click();
    await expect(page.getByRole('tab', { name: /Completed/ })).toContainText('1');
    await expect.poll(async () => (await page.evaluate(() => chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] }))).length).toBe(1);
    expect(await page.evaluate(() => chrome.runtime.sendMessage({ target: 'completion-sound-offscreen', soundId: 'soft' }))).toEqual({ played: true });
  });

  test('moves one filter highlight between task views', async ({ page, gotoPopup }) => {
    await gotoPopup(page);
    const indicator = page.getByTestId('task-filter-indicator');
    await expect(indicator).toHaveCount(1);
    const initial = await indicator.boundingBox();
    await page.getByRole('tab', { name: /Completed/ }).click();
    await expect(page.getByRole('tab', { name: /Completed/ })).toHaveAttribute('aria-selected', 'true');
    await expect.poll(async () => (await indicator.boundingBox())?.x).toBeGreaterThan(initial?.x || 0);
    await expect(indicator).toHaveCount(1);
  });

  test('pauses, resumes, and deletes a task from its row actions', async ({ page, gotoPopup, mockNas }) => {
    mockNas.state.tasks = [{
      id: 'row-action-task',
      title: 'Row action task.zip',
      status: 'downloading',
      size: 1024,
      type: 'http',
      username: 'admin',
      additional: {
        transfer: {
          size_downloaded: 256,
          size_uploaded: 0,
          speed_download: 128,
          speed_upload: 0,
        },
      },
    }];

    await gotoPopup(page);
    await page.getByRole('button', { name: 'Refresh tasks', exact: true }).click();
    await expect(page.getByText('Row action task.zip')).toBeVisible();

    await page.getByRole('button', { name: 'Pause Row action task.zip' }).click();
    await expect.poll(() => mockNas.state.tasks[0]?.status).toBe('paused');
    await expect(page.getByRole('button', { name: 'Resume Row action task.zip' })).toBeVisible();

    await page.getByRole('button', { name: 'Resume Row action task.zip' }).click();
    await expect.poll(() => mockNas.state.tasks[0]?.status).toBe('downloading');

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Delete Row action task.zip' }).click();
    await expect.poll(() => mockNas.state.tasks.length).toBe(0);
    await expect(page.getByText('Row action task.zip')).toBeHidden();
  });

  test('shows an open-folder action instead of resume for completed downloads', async ({ page, gotoPopup, mockNas }) => {
    mockNas.state.tasks = [{
      id: 'finished-task', title: 'Finished movie.mkv', status: 'finished', size: 1024,
      type: 'http', username: 'admin',
      additional: { detail: { destination: '/volume1/downloads', uri: 'http://example.com/movie.mkv', create_time: 1, started_time: 2, completed_time: 3, priority: 'normal' }, transfer: { size_downloaded: 1024, size_uploaded: 0, speed_download: 0, speed_upload: 0 } },
    }];
    await gotoPopup(page);
    await page.getByRole('button', { name: 'Refresh tasks', exact: true }).click();
    const folder = page.getByRole('button', { name: 'Open destination folder for Finished movie.mkv' });
    await expect(folder).toBeVisible();
    await expect(folder).toHaveAttribute('title', 'Open destination folder in File Station');
    await expect(page.getByRole('button', { name: 'Resume Finished movie.mkv' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Delete Finished movie.mkv' })).toHaveAttribute('title', 'Delete task');
  });

  test('animates search open and close without shifting the quick-add control', async ({ page, gotoPopup }) => {
    await page.setViewportSize({ width: 580, height: 720 });
    await gotoPopup(page);
    const quickAdd = page.getByRole('textbox', { name: 'Quick-add URL or magnet link' });
    const before = await quickAdd.boundingBox();
    await page.getByRole('button', { name: 'Search tasks' }).click();
    const search = page.getByRole('textbox', { name: 'Search downloads' });
    await expect(search).toBeVisible();
    await expect(page.locator('[class*="searchBar"]')).toHaveCSS('opacity', '1');
    await expect(page.getByRole('button', { name: 'Close search' })).toHaveAttribute('title', 'Close search (Esc)');
    await page.screenshot({ path: path.join(tmpdir(), 'r22e-search-open-580.png') });
    await page.getByRole('button', { name: 'Close search' }).click();
    await expect(search).toBeHidden();
    await expect.poll(async () => (await quickAdd.boundingBox())?.y).toBeCloseTo(before!.y, 0);
  });

  test('applies pause, resume, and delete actions to a task selection', async ({ page, gotoPopup, mockNas }) => {
    mockNas.state.tasks = ['First bulk task', 'Second bulk task'].map((title, index) => ({
      id: `bulk-task-${index + 1}`,
      title,
      status: 'downloading',
      size: 2048,
      type: 'http',
      username: 'admin',
      additional: {
        transfer: {
          size_downloaded: 512,
          size_uploaded: 0,
          speed_download: 256,
          speed_upload: 0,
        },
      },
    }));

    await gotoPopup(page);
    await page.getByRole('button', { name: 'Refresh tasks', exact: true }).click();
    await expect(page.getByText('First bulk task')).toBeVisible();
    await expect(page.getByText('Second bulk task')).toBeVisible();
    await page.getByRole('checkbox', { name: 'Select visible tasks' }).check();

    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect.poll(() => mockNas.state.tasks.map(task => task.status)).toEqual(['paused', 'paused']);

    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect.poll(() => mockNas.state.tasks.map(task => task.status)).toEqual(['downloading', 'downloading']);

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect.poll(() => mockNas.state.tasks.length).toBe(0);
  });

  test('fills task actions with their meaning on hover and shows the clear icon', async ({ page, gotoPopup, mockNas }) => {
    mockNas.state.tasks = [
      { id: 'action-active', title: 'Active task.zip', status: 'downloading', size: 2048, type: 'http', username: 'admin' },
      { id: 'action-done', title: 'Completed task.zip', status: 'finished', size: 2048, type: 'http', username: 'admin' },
    ];
    await page.setViewportSize({ width: 580, height: 720 });
    await gotoPopup(page);
    await page.getByRole('button', { name: 'Refresh tasks', exact: true }).click();
    await expect(page.getByText('Active task.zip')).toBeVisible();
    await page.getByRole('checkbox', { name: 'Select Active task.zip' }).check();

    const clear = page.getByRole('button', { name: 'Clear completed' });
    await expect(clear.locator('svg')).toHaveAttribute('class', /lucide-brush-cleaning/);

    for (const [name, file] of [
      ['Resume', 'resume'],
      ['Pause', 'pause'],
      ['Delete', 'delete'],
      ['Clear completed', 'clear'],
    ] as const) {
      const button = page.getByRole('button', { name, exact: true });
      await button.hover();
      await expect.poll(() => button.evaluate(element => getComputedStyle(element, '::before').transform)).toBe('matrix(1, 0, 0, 1, 0, 0)');
      if (name === 'Pause') {
        await expect(button).toHaveCSS('color', 'rgb(255, 255, 255)');
        await expect(button.locator('svg')).toHaveCSS('fill', 'rgb(255, 255, 255)');
      }
      await page.screenshot({ path: path.join(tmpdir(), `r22e-${file}-action-hover-580.png`) });
    }

    await page.getByTitle('Settings').click();
    await page.getByRole('button', { name: 'Appearance' }).click();
    await page.getByRole('tab', { name: 'Dark', exact: true }).click();
    await page.getByRole('button', { name: 'Back' }).click();
    await clear.hover();
    await expect.poll(() => clear.evaluate(element => getComputedStyle(element, '::before').transform)).toBe('matrix(1, 0, 0, 1, 0, 0)');
    await page.screenshot({ path: path.join(tmpdir(), 'r22e-clear-action-hover-dark-580.png') });
  });
});
