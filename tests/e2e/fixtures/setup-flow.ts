import { expect, type Page } from '@playwright/test';
import type { MockNasServer } from './mock-server';

export async function addMockNasAndConnect(page: Page, mockNas: MockNasServer, password = 'password123') {
  await page.getByText('Add NAS').click();
  await page.getByRole('button', { name: /Local HTTP Port 5000/ }).click();
  await page.getByLabel(/^NAS address$/i).fill(mockNas.getUrl());
  // The E2E manifest already grants mock-host access. Wait for the async
  // permission check rather than clicking a control that disappears on grant.
  await expect(page.getByLabel('Username', { exact: true })).toBeEnabled();
  await page.getByLabel(/Username/i).fill('admin');
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Save and connect' }).click();
}
