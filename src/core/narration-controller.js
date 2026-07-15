export function createNarrationController({
  createAudio = (src) => src ? new Audio(src) : null,
  speak = typeof speechSynthesis !== 'undefined' ? (text) => {
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  } : null,
  onChange = () => {},
} = {}) {
  let activeAudio = null;
  let state = { activeId: null, status: 'idle', text: '' };
  const setState = (next) => { state = { ...state, ...next }; onChange({ ...state }); };
  const stop = () => {
    activeAudio?.pause?.();
    activeAudio = null;
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel?.();
    setState({ activeId: null, status: 'idle' });
  };
  const play = async ({ id, src, text }) => {
    if (activeAudio) activeAudio.pause?.();
    setState({ activeId: id, status: 'loading', text });
    activeAudio = createAudio?.(src);
    if (activeAudio) {
      try {
        await activeAudio.play();
        setState({ status: 'playing' });
        return 'audio';
      } catch { activeAudio = null; }
    }
    if (speak) {
      await speak(text);
      setState({ status: 'fallback' });
      return 'speech';
    }
    setState({ status: 'text-only' });
    return 'text';
  };
  const pause = () => { activeAudio?.pause?.(); setState({ status: 'paused' }); };
  return { play, pause, stop, getState: () => ({ ...state }) };
}
