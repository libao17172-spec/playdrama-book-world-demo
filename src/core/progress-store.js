const prefix = 'playdrama:book-world:progress:';

function emptyProgress(contentId) {
  return {
    contentId,
    discovered: [],
    deepened: [],
    visitedZones: [],
    playedNarrations: [],
    lastExperiencedAt: null,
  };
}

export function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

export function createProgressStore(storage = globalThis.localStorage) {
  const key = (contentId) => `${prefix}${contentId}`;
  const load = (contentId) => {
    try {
      return { ...emptyProgress(contentId), ...JSON.parse(storage?.getItem(key(contentId)) || '{}') };
    } catch {
      return emptyProgress(contentId);
    }
  };
  const save = (contentId, value) => {
    const next = { ...value, contentId, lastExperiencedAt: new Date().toISOString() };
    try { storage?.setItem(key(contentId), JSON.stringify(next)); } catch { /* 探索不能被存储错误阻断 */ }
    return next;
  };
  const add = (contentId, field, value) => {
    const current = load(contentId);
    current[field] = [...new Set([...current[field], value])];
    return save(contentId, current);
  };
  return {
    load,
    save,
    discover: (contentId, id) => add(contentId, 'discovered', id),
    deepen: (contentId, id) => {
      const withDiscovery = add(contentId, 'discovered', id);
      return save(contentId, { ...withDiscovery, deepened: [...new Set([...withDiscovery.deepened, id])] });
    },
    visitZone: (contentId, id) => add(contentId, 'visitedZones', id),
    markNarrationPlayed: (contentId, id) => add(contentId, 'playedNarrations', id),
    reset: (contentId) => { storage?.removeItem(key(contentId)); return emptyProgress(contentId); },
  };
}
