import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryStorage, createProgressStore } from '../src/core/progress-store.js';

describe('内容包进度', () => {
  let storage;
  let store;

  beforeEach(() => {
    storage = createMemoryStorage();
    store = createProgressStore(storage);
  });

  it('发现、深入、区域访问和旁白播放可以持久化', () => {
    store.discover('naval-almanack', 'leverage');
    store.deepen('naval-almanack', 'leverage');
    store.visitZone('naval-almanack', 'wealth');
    store.markNarrationPlayed('naval-almanack', 'zone:wealth');

    const reloaded = createProgressStore(storage).load('naval-almanack');
    expect(reloaded.discovered).toContain('leverage');
    expect(reloaded.deepened).toContain('leverage');
    expect(reloaded.visitedZones).toContain('wealth');
    expect(reloaded.playedNarrations).toContain('zone:wealth');
    expect(reloaded.lastExperiencedAt).toBeTruthy();
  });

  it('不同内容包的进度互相隔离', () => {
    store.discover('naval-almanack', 'leverage');
    store.discover('smoke-test-story', 'lin');
    expect(store.load('naval-almanack').discovered).toEqual(['leverage']);
    expect(store.load('smoke-test-story').discovered).toEqual(['lin']);
  });
});
