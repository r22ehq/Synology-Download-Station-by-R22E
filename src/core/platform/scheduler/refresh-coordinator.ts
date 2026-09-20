type FetchFunction<T> = (profileId: string) => Promise<T>;

export class RefreshCoordinator<T> {
  private inFlight = new Map<string, Promise<T>>();
  private cache = new Map<string, { data: T; timestamp: number }>();
  private fetchFn: FetchFunction<T>;
  private minFreshnessMs: number;

  constructor(fetchFn: FetchFunction<T>, minFreshnessMs = 2000) {
    this.fetchFn = fetchFn;
    this.minFreshnessMs = minFreshnessMs;
  }

  /**
   * Requests a refresh. If a request is already in flight for this profile,
   * returns the existing promise. If the cache is fresh enough, returns it.
   */
  public async requestRefresh(profileId: string): Promise<T> {
    const cached = this.cache.get(profileId);
    if (cached && Date.now() - cached.timestamp < this.minFreshnessMs) {
      return cached.data;
    }

    if (this.inFlight.has(profileId)) {
      return this.inFlight.get(profileId)!;
    }

    const promise = this.fetchFn(profileId)
      .then((data) => {
        this.cache.set(profileId, { data, timestamp: Date.now() });
        return data;
      })
      .finally(() => {
        this.inFlight.delete(profileId);
      });

    this.inFlight.set(profileId, promise);
    return promise;
  }

  public getCache(profileId: string): T | undefined {
    return this.cache.get(profileId)?.data;
  }

  public clearCache(profileId: string): void {
    this.cache.delete(profileId);
  }
}
