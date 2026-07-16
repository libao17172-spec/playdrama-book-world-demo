import { describe, expect, it } from 'vitest';
import {
  clampToWorld,
  getFacing,
  getNearestNode,
  getRouteProgress,
  isNodeInteractable,
} from '../src/game/world-model.js';

const world = { width: 2304, height: 1536, padding: 72, walkable: { left: 72, top: 980, right: 2232, bottom: 1464 } };
const nodes = [
  { id: 'reading', world2d: { x: 1100, y: 610, interactionRadius: 125 } },
  { id: 'specific-knowledge', world2d: { x: 1850, y: 820, interactionRadius: 125 } },
];

describe('2.5D 世界规则', () => {
  it('把角色限制在清晰的地图边界内', () => {
    expect(clampToWorld({ x: -40, y: 1900 }, world)).toEqual({ x: 72, y: 1464 });
    expect(clampToWorld({ x: 900, y: 1100 }, world)).toEqual({ x: 900, y: 1100 });
    expect(clampToWorld({ x: 900, y: 500 }, world)).toEqual({ x: 900, y: 980 });
  });

  it('根据实际移动方向切换人物朝向', () => {
    expect(getFacing(0, -1)).toBe('away');
    expect(getFacing(0, 1)).toBe('toward');
    expect(getFacing(-1, 0)).toBe('left');
    expect(getFacing(1, 0)).toBe('right');
  });

  it('只有走进知识节点范围后才允许互动', () => {
    expect(getNearestNode({ x: 1050, y: 650 }, nodes)?.id).toBe('reading');
    expect(isNodeInteractable({ x: 1050, y: 650 }, nodes[0])).toBe(true);
    expect(isNodeInteractable({ x: 400, y: 1300 }, nodes[0])).toBe(false);
  });

  it('按照指定路线计算学习进度和完成状态', () => {
    const route = ['reading', 'specific-knowledge', 'desire'];
    expect(getRouteProgress(route, ['reading'])).toEqual({ completed: 1, total: 3, ratio: 1 / 3, done: false, nextId: 'specific-knowledge' });
    expect(getRouteProgress(route, route)).toEqual({ completed: 3, total: 3, ratio: 1, done: true, nextId: null });
  });
});
