export function createGuidance() {
  let target = null;
  return {
    setTarget: (next) => { target = { ...next }; return target; },
    getTarget: () => target ? { ...target } : null,
    clear: () => { target = null; },
  };
}
