const isDisconnected = (error: unknown) => error instanceof Error &&
  /message port closed|receiving end does not exist|message channel closed|extension context invalidated|^No response$/i.test(error.message);

export function backgroundErrorMessage(error: unknown, fallback: string): string {
  return isDisconnected(error)
    ? 'The extension background did not respond. Reload the extension on your browser’s Extensions page, then reopen this window.'
    : error instanceof Error ? error.message : fallback;
}

// Only read operations may be replayed: retrying a save could apply it twice.
export async function readFromBackground<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (!isDisconnected(error)) throw error;
    await new Promise(resolve => setTimeout(resolve, 250));
    return request();
  }
}
