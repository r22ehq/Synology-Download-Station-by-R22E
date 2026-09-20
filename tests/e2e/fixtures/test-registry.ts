export interface TestTaskRecord {
  id: string;
  kind: 'http' | 'magnet';
  uri: string;
  destination: string;
  createdAt: number;
  deleted: boolean;
}

export class TestResourceRegistry {
  private records = new Map<string, TestTaskRecord>();

  add(record: Omit<TestTaskRecord, 'createdAt' | 'deleted'>): void {
    this.records.set(record.id, {
      ...record,
      createdAt: Date.now(),
      deleted: false
    });
  }

  markDeleted(id: string): void {
    const record = this.records.get(id);
    if (record) {
      record.deleted = true;
    }
  }

  getPendingDeletions(): TestTaskRecord[] {
    return Array.from(this.records.values()).filter(r => !r.deleted);
  }

  getAll(): TestTaskRecord[] {
    return Array.from(this.records.values());
  }

  clear(): void {
    this.records.clear();
  }
}
