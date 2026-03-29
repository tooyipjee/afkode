import { vi } from 'vitest';

export default class MockStore<T extends Record<string, any>> {
  private data: T;

  constructor(opts?: { defaults?: T }) {
    this.data = { ...(opts?.defaults ?? ({} as T)) };
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.data[key];
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    this.data[key] = value;
  }

  get store(): T {
    return { ...this.data };
  }
}
