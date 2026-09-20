import { test, expect } from './fixtures/extension';

test.describe('Profile Configuration', () => {
  test('allows adding and deleting a NAS profile', async ({ page, gotoOptions, mockNas }) => {
    await gotoOptions(page);
    
    // Open the form
    await page.getByRole('button', { name: 'Add NAS Connection' }).click();

    // Fill form
    await page.getByLabel(/NAS URL/i).fill(mockNas.getUrl());
    await page.getByLabel(/Username/i).fill('admin');
    await page.getByLabel(/Password/i).fill('password123');
    await page.getByRole('button', { name: 'Save Profile' }).click();
    
    // Expect the profile to be in the list
    await expect(page.getByText(mockNas.getUrl())).toBeVisible();
    await expect(page.getByText('admin')).toBeVisible();
    
    // Delete
    page.on('dialog', dialog => dialog.accept());
    
    // Click the delete button. In the source, it's a Button with variant="danger" 
    // wrapping a Trash icon, or we can just grab it by role. Let's see if there's a title or text.
    // The source showed `<Button variant="danger" size="sm" onClick={() => removeProfile(p.id)}>`
    const deleteBtn = page.getByRole('button', { name: /Remove/i });
    await deleteBtn.first().click();
    
    // Should be empty again
    await expect(page.getByText(mockNas.getUrl())).toBeHidden();
  });
});