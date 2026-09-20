import { test, expect } from './fixtures/extension';

test.describe('Extension Startup', () => {
  test('Service worker starts up successfully and extension ID is resolvable', async ({ extensionId }) => {
    // The fixture handles resolving the extensionId by waiting for the service worker
    expect(extensionId).toBeDefined();
    expect(extensionId.length).toBeGreaterThan(10);
    
    // We can also verify that there are no console errors 
    // because the fixture throws on page errors automatically.
  });
});
