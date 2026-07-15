import { describe, expect, it } from 'vitest';
import { detectContentType, validateContentPack } from '../src/core/content-schema.js';
import { contentPacks, getContentPack } from '../src/content/index.js';

describe('通用内容包', () => {
  it('校验两个内容包且识别知识与故事类型', () => {
    expect(contentPacks).toHaveLength(2);
    for (const pack of contentPacks) {
      expect(validateContentPack(pack)).toEqual({ valid: true, errors: [] });
    }
    expect(detectContentType(getContentPack('naval-almanack'))).toBe('knowledge');
    expect(detectContentType(getContentPack('smoke-test-story'))).toBe('story');
  });

  it('拒绝缺少通用实体和关系的内容包', () => {
    const result = validateContentPack({ id: 'broken', contentType: 'knowledge' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('缺少标题');
    expect(result.errors).toContain('至少需要一个区域');
    expect(result.errors).toContain('至少需要一个实体');
    expect(result.errors).toContain('至少需要一条关系');
  });

  it('纳瓦尔内容包包含12个知识实体、3个主题区域和至少6个深入互动', () => {
    const pack = getContentPack('naval-almanack');
    expect(pack.zones).toHaveLength(3);
    expect(pack.entities.filter((item) => item.type === 'knowledge')).toHaveLength(12);
    expect(pack.entities.filter((item) => item.interaction?.enabled)).toHaveLength(8);
  });

  it('故事测试内容包含两区、两个人物、一个物品和三节点人物关系图', () => {
    const pack = getContentPack('smoke-test-story');
    expect(pack.graphMode).toBe('character');
    expect(pack.zones).toHaveLength(2);
    expect(pack.entities.filter((item) => item.type === 'character')).toHaveLength(2);
    expect(pack.entities.filter((item) => item.type === 'item')).toHaveLength(1);
    expect(pack.entities).toHaveLength(3);
  });
});
