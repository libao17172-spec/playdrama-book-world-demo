const TYPES = new Set(['knowledge', 'story', 'script']);
const ENTITY_TYPES = new Set(['knowledge', 'character', 'location', 'event', 'item']);
const RELATION_TYPES = new Set(['supports', 'influences', 'contrasts', 'extends', 'knows', 'conflicts', 'belongs_to', 'happens_at', 'owns', 'causes']);

export function detectContentType(pack) {
  return TYPES.has(pack?.contentType) ? pack.contentType : 'unknown';
}

export function validateContentPack(pack) {
  const errors = [];
  if (!pack?.id) errors.push('缺少内容包ID');
  if (!pack?.title) errors.push('缺少标题');
  if (!TYPES.has(pack?.contentType)) errors.push('内容类型无效');
  if (!pack?.graphMode) errors.push('缺少关系图模式');
  if (!Array.isArray(pack?.zones) || pack.zones.length === 0) errors.push('至少需要一个区域');
  if (!Array.isArray(pack?.entities) || pack.entities.length === 0) errors.push('至少需要一个实体');
  if (!Array.isArray(pack?.relations) || pack.relations.length === 0) errors.push('至少需要一条关系');

  const zoneIds = new Set((pack?.zones || []).map((zone) => zone.id));
  const entityIds = new Set((pack?.entities || []).map((entity) => entity.id));
  for (const entity of pack?.entities || []) {
    if (!ENTITY_TYPES.has(entity.type)) errors.push(`实体类型无效：${entity.id}`);
    if (!zoneIds.has(entity.zoneId)) errors.push(`实体区域不存在：${entity.id}`);
    if (!Array.isArray(entity.position) || entity.position.length !== 3) errors.push(`实体位置无效：${entity.id}`);
    if (!entity.title || !entity.summary || !entity.narration) errors.push(`实体内容不完整：${entity.id}`);
  }
  for (const relation of pack?.relations || []) {
    if (!entityIds.has(relation.from) || !entityIds.has(relation.to)) errors.push(`关系端点不存在：${relation.from}-${relation.to}`);
    if (!RELATION_TYPES.has(relation.type)) errors.push(`关系类型无效：${relation.type}`);
  }
  return { valid: errors.length === 0, errors };
}

export const contentSchema = {
  contentTypes: [...TYPES],
  entityTypes: [...ENTITY_TYPES],
  relationTypes: [...RELATION_TYPES],
};
