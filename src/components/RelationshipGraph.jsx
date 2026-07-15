const relationLabels = {
  supports: '支持', influences: '影响', contrasts: '对照', extends: '延伸',
  knows: '认识', conflicts: '冲突', belongs_to: '属于', happens_at: '发生于', owns: '持有', causes: '导致',
};

export function RelationshipGraph({ pack, progress, selectedId, onSelect, onClose, onGuide, onOpenDetail }) {
  const width = 760; const height = 520;
  const groups = pack.zones;
  const positions = new Map();
  groups.forEach((zone, groupIndex) => {
    const nodes = pack.entities.filter((item) => item.zoneId === zone.id);
    const cx = 145 + groupIndex * (470 / Math.max(1, groups.length - 1));
    nodes.forEach((node, index) => {
      const spread = nodes.length === 1 ? 0 : (index - (nodes.length - 1) / 2) * 88;
      positions.set(node.id, [cx + Math.sin(index * 1.7) * 32, 260 + spread]);
    });
  });
  const selected = pack.entities.find((item) => item.id === selectedId) || pack.entities[0];
  const isDiscovered = (id) => progress.discovered.includes(id);
  const isDeepened = (id) => progress.deepened.includes(id);
  const zone = pack.zones.find((item) => item.id === selected.zoneId);
  return <div className="modal graph-modal" role="dialog" aria-label={`${pack.graphMode === 'character' ? '人物' : '知识'}关系图`}>
    <header className="modal-header">
      <div><span className="eyebrow">ARCHIVE / 世界档案</span><h2>{pack.graphMode === 'character' ? '人物关系图' : '知识关系图'}</h2></div>
      <div className="graph-progress"><strong>{progress.discovered.length}</strong><span>/ {pack.entities.length} 已发现</span></div>
      <button className="icon-button" onClick={onClose} aria-label="关闭关系图">×</button>
    </header>
    <div className="graph-body">
      <div className="graph-stage">
        <svg viewBox={`0 0 ${width} ${height}`} aria-label="关系连线">
          <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#a38755" /></marker></defs>
          {pack.relations.map((edge, index) => {
            const from = positions.get(edge.from); const to = positions.get(edge.to);
            if (!from || !to) return null;
            const visible = isDiscovered(edge.from) || isDiscovered(edge.to);
            return <g key={index} opacity={visible ? 0.9 : 0.18}>
              <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke="#a38755" strokeWidth="1.7" strokeDasharray={edge.type === 'contrasts' ? '7 6' : undefined} markerEnd={edge.type === 'contrasts' ? undefined : 'url(#arrow)'} />
              {visible && <text x={(from[0] + to[0]) / 2} y={(from[1] + to[1]) / 2 - 7} fill="#76623e" fontSize="11" textAnchor="middle">{relationLabels[edge.type]}</text>}
            </g>;
          })}
        </svg>
        {pack.zones.map((item, index) => <div key={item.id} className="graph-zone-title" style={{ left: `${11 + index * (74 / Math.max(1, pack.zones.length - 1))}%`, borderColor: item.color }}>{item.name}</div>)}
        {pack.entities.map((entity) => {
          const [x, y] = positions.get(entity.id); const discovered = isDiscovered(entity.id); const deep = isDeepened(entity.id);
          const entityZone = pack.zones.find((item) => item.id === entity.zoneId);
          return <button key={entity.id} onClick={() => onSelect(entity.id)} className={`graph-node ${selected.id === entity.id ? 'selected' : ''} ${discovered ? 'discovered' : 'locked'} ${deep ? 'deepened' : ''}`} style={{ left: `${(x / width) * 100}%`, top: `${(y / height) * 100}%`, '--node-color': entityZone.color }}>
            <span className="node-mark">{deep ? '✓' : discovered ? '•' : '?'}</span><strong>{entity.title}</strong><small>{discovered ? entity.summary : `${entityZone.name} · 待探索`}</small>
          </button>;
        })}
      </div>
      <aside className="graph-inspector">
        <span className="eyebrow">{isDeepened(selected.id) ? '已深入' : isDiscovered(selected.id) ? '已发现' : '尚未发现'}</span>
        <h3>{selected.title}</h3>
        <p>{isDiscovered(selected.id) ? selected.summary : `线索指向${zone.name}，靠近场景中的对应物件才能发现完整内容。`}</p>
        <div className="inspector-meta"><span>所属区域</span><strong>{zone.name}</strong></div>
        <div className="inspector-meta"><span>关联数量</span><strong>{pack.relations.filter((r) => r.from === selected.id || r.to === selected.id).length}</strong></div>
        <button className="primary-button compact" onClick={() => onGuide(selected)}>前往地点 <span>→</span></button>
        {isDiscovered(selected.id) && selected.interaction?.enabled && <button className="ghost-button" onClick={() => onOpenDetail(selected)}>查看完整讲解</button>}
      </aside>
    </div>
  </div>;
}
