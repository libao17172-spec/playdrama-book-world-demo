import { useState } from 'react';

export function EntryScreen({ packs, initialId, onEnter }) {
  const [selectedId, setSelectedId] = useState(initialId);
  const selected = packs.find((item) => item.id === selectedId) || packs[0];
  return <main className="entry-screen" style={{ '--theme-accent': selected.theme.accent, '--theme-ink': selected.theme.ink }}>
    <div className="entry-noise" />
    <nav className="entry-nav"><div className="brand"><span className="brand-seal">书</span><span><b>书境</b><small>PLAYDRAMA WORLD ENGINE</small></span></div><span className="demo-badge">内部孵化 DEMO · v1.0</span></nav>
    <section className="entry-hero">
      <div className="hero-copy">
        <span className="eyebrow">走进一本书，而非翻过一页书</span>
        <h1>让知识拥有<br /><em>可以行走的世界</em></h1>
        <p>{selected.summary}</p>
        <div className="hero-actions"><button className="primary-button" onClick={() => onEnter(selected.id)}>进入「{selected.worldName}」<span>→</span></button><span className="duration">◷ {selected.duration}<br /><small>无需登录 · 离线可用</small></span></div>
      </div>
      <div className="world-preview" aria-label="世界预览">
        <div className="preview-orbit one" /><div className="preview-orbit two" />
        <div className="preview-island"><div className="island-building"><i /><i /><i /></div><div className="island-water" /><div className="island-person" /></div>
        {selected.zones.map((zone, index) => <div key={zone.id} className={`preview-label label-${index}`}><span style={{ background: zone.color }} />{zone.name}<small>{zone.landmark}</small></div>)}
      </div>
    </section>
    <section className="pack-section">
      <div className="section-heading"><div><span className="eyebrow">CONTENT PACKS</span><h2>选择一个内容世界</h2></div><p>相同引擎，不同知识、人物、地点与关系</p></div>
      <div className="pack-grid">{packs.map((pack, index) => <button key={pack.id} className={`pack-card ${selectedId === pack.id ? 'selected' : ''}`} onClick={() => setSelectedId(pack.id)}>
        <div className="pack-index">0{index + 1}</div><span className="pack-type">{pack.contentType === 'knowledge' ? '知识世界' : '故事世界'}</span><h3>{pack.title}</h3><p>{pack.subtitle}</p><div className="pack-zones">{pack.zones.map((zone) => <span key={zone.id} style={{ '--zone': zone.color }}>{zone.name}</span>)}</div><div className="pack-footer"><span>{pack.entities.length} 个探索节点</span><b>{selectedId === pack.id ? '已选择 ✓' : '选择世界 →'}</b></div>
      </button>)}</div>
    </section>
    <footer className="entry-footer"><span>第三人称探索</span><span>空间知识节点</span><span>关系图谱</span><span>本地进度</span><a href="./asset-ledger.html">资产授权台账 ↗</a></footer>
  </main>;
}
