import { describe, expect, it, vi } from 'vitest';
import { createNarrationController } from '../src/core/narration-controller.js';
import { createGuidance } from '../src/core/guidance.js';
import { getZoneNarrationAction } from '../src/core/zone-policy.js';

describe('旁白与地点指引', () => {
  it('同一时间只播放一段旁白并停止上一段', async () => {
    const first = { play: vi.fn().mockResolvedValue(), pause: vi.fn() };
    const second = { play: vi.fn().mockResolvedValue(), pause: vi.fn() };
    const controller = createNarrationController({ createAudio: (src) => src === 'a.mp3' ? first : second });
    await controller.play({ id: 'a', src: 'a.mp3', text: '第一段' });
    await controller.play({ id: 'b', src: 'b.mp3', text: '第二段' });
    expect(first.pause).toHaveBeenCalledOnce();
    expect(second.play).toHaveBeenCalledOnce();
    expect(controller.getState().activeId).toBe('b');
  });

  it('固定音频缺失时回退到系统语音，系统语音也缺失时保留文字', async () => {
    const speak = vi.fn().mockResolvedValue();
    const controller = createNarrationController({
      createAudio: () => ({ play: vi.fn().mockRejectedValue(new Error('missing')), pause: vi.fn() }),
      speak,
    });
    await controller.play({ id: 'fallback', src: 'missing.mp3', text: '仍然能看到的讲解' });
    expect(speak).toHaveBeenCalledWith('仍然能看到的讲解');
    expect(controller.getState().status).toBe('fallback');

    const textOnly = createNarrationController({ createAudio: () => null, speak: null });
    await textOnly.play({ id: 'text', src: '', text: '纯文字' });
    expect(textOnly.getState().status).toBe('text-only');
  });

  it('地点指引记录目标、位置并可清除', () => {
    const guide = createGuidance();
    guide.setTarget({ id: 'leverage', position: [8, 0, -10], label: '杠杆' });
    expect(guide.getTarget()).toEqual({ id: 'leverage', position: [8, 0, -10], label: '杠杆' });
    guide.clear();
    expect(guide.getTarget()).toBeNull();
  });

  it('区域首次进入自动播放，重复进入提供重播，音频冲突时只显示标题', () => {
    const fresh = { visitedZones: [], playedNarrations: [] };
    expect(getZoneNarrationAction(fresh, 'wealth', false)).toBe('auto-play');
    expect(getZoneNarrationAction({ visitedZones: ['wealth'], playedNarrations: ['zone:wealth'] }, 'wealth', false)).toBe('offer-replay');
    expect(getZoneNarrationAction(fresh, 'wealth', true)).toBe('show-title');
  });
});
