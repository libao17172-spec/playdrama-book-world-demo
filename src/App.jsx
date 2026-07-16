import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { contentPacks, getContentPack } from './content/index.js';
import { createProgressStore } from './core/progress-store.js';
import { createNarrationController } from './core/narration-controller.js';
import { getZoneNarrationAction } from './core/zone-policy.js';
import { EntryScreen } from './components/EntryScreen.jsx';
import { RelationshipGraph } from './components/RelationshipGraph.jsx';
import { WorldCanvas } from './components/WorldCanvas.jsx';
import { PhaserWorld } from './game/PhaserWorld.jsx';
import { getRouteProgress } from './game/world-model.js';

const progressStore = typeof window !== 'undefined' ? createProgressStore(window.localStorage) : null;

function DetailModal({ entity, zone, onClose, onPlay }) {
  const lesson = entity.lesson || {};
  return <div className="modal detail-modal" role="dialog" aria-label={`${entity.title}知识详情`}>
    <div className="detail-visual" style={{ '--detail-color': zone.color }}><span className="detail-orbit" /><div className="detail-glyph">{entity.title.slice(0, 1)}</div><small>{zone.name} · {entity.type.toUpperCase()}</small></div>
    <div className="detail-content"><button className="icon-button detail-close" onClick={onClose} aria-label="关闭详情">×</button><span className="eyebrow">深入探索 / DEEP DIVE</span><h2>{entity.title}</h2><blockquote>{entity.summary}</blockquote><section className="lesson-section"><h3>理解它</h3><p>{lesson.explanation || entity.detail || entity.summary}</p></section>{lesson.example && <section className="lesson-section"><h3>放进现实</h3><p>{lesson.example}</p></section>}{lesson.action && <section className="lesson-section action"><h3>现在可以做什么</h3><p>{lesson.action}</p></section>}{lesson.question && <section className="lesson-question"><span>想一想</span><p>{lesson.question}</p></section>}<div className="source-box"><span>内容出处</span><p>{entity.source}</p></div><div className="detail-actions"><button className="primary-button compact" onClick={() => onPlay(entity)}>显示讲解文字 <span>文</span></button><button className="ghost-button" onClick={onClose}>返回世界</button></div></div>
  </div>;
}

function HelpModal({ onClose }) {
  return <div className="modal help-modal" role="dialog" aria-label="操作说明"><button className="icon-button detail-close" onClick={onClose}>×</button><span className="eyebrow">HOW TO EXPLORE</span><h2>如何探索书境</h2><div className="control-grid"><div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><strong>移动角色</strong><p>方向键同样可用</p></div><div><i className="mouse-icon">◎</i><strong>点击道路</strong><p>角色会走向点击的位置</p></div><div><kbd>E</kbd><strong>互动</strong><p>靠近发光节点后触发</p></div><div><kbd>R</kbd><strong>返回道路</strong><p>随时回到中央安全道路</p></div></div><p className="help-note">按 <kbd>G</kbd> 或点击右上角按钮打开关系图，按 <kbd>Esc</kbd> 关闭当前界面。</p></div>;
}

function CompletionModal({ pack, onClose, onGraph }) {
  const routeEntities = pack.world2d.route.map((id) => pack.entities.find((entity) => entity.id === id));
  return <div className="modal completion-modal" role="dialog" aria-label="章节学习完成">
    <span className="completion-seal">完成</span><span className="eyebrow">CHAPTER COMPLETE</span><h2>{pack.world2d.routeTitle}</h2>
    <p>你已经亲自走过三个知识地点，完成了这一章的学习路线。</p>
    <div className="completion-summary">{routeEntities.map((entity) => <div key={entity.id}><strong>{entity.title}</strong><span>{entity.summary}</span></div>)}</div>
    <div className="detail-actions"><button className="primary-button" onClick={onGraph}>查看知识图谱</button><button className="ghost-button" onClick={onClose}>继续自由探索</button></div>
  </div>;
}

export function App() {
  const queryId = new URLSearchParams(location.search).get('content');
  const [screen, setScreen] = useState('entry');
  const [packId, setPackId] = useState(queryId || 'naval-almanack');
  const pack = useMemo(() => getContentPack(packId), [packId]);
  const [progress, setProgress] = useState(() => progressStore.load(pack.id));
  const [nearby, setNearby] = useState(null);
  const nearbyRef = useRef(null);
  const [currentZone, setCurrentZone] = useState(null);
  const lastZone = useRef(null);
  const [detail, setDetail] = useState(null);
  const [showGraph, setShowGraph] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionAcknowledged, setCompletionAcknowledged] = useState(false);
  const [graphSelected, setGraphSelected] = useState(null);
  const [guidance, setGuidance] = useState(null);
  const [player, setPlayer] = useState(() => ({ position: pack.world2d ? [pack.world2d.spawn.x, 0, pack.world2d.spawn.y] : pack.spawn, yaw: 0, facing: 'away', moving: false }));
  const [resetSignal, setResetSignal] = useState(0);
  const [audioState, setAudioState] = useState({ activeId: null, status: 'idle', text: '' });
  const [toast, setToast] = useState('');
  const controller = useMemo(() => createNarrationController({ onChange: setAudioState, speak: null }), []);

  const refreshProgress = useCallback(() => setProgress(progressStore.load(pack.id)), [pack.id]);
  const playNarration = useCallback(async (item, kind = 'entity') => {
    const id = `${kind}:${item.id}`;
    if (audioState.activeId === id && audioState.status === 'playing') { controller.pause(); return; }
    await controller.play({ id, src: item.audio, text: item.narration });
    progressStore.markNarrationPlayed(pack.id, id); refreshProgress();
  }, [audioState, controller, pack.id, refreshProgress]);

  const enterPack = useCallback((id) => {
    controller.stop(); setPackId(id); const next = getContentPack(id); setProgress(progressStore.load(next.id));
    setNearby(null); nearbyRef.current = null; setCurrentZone(null); lastZone.current = null; setDetail(null); setShowGraph(false); setShowCompletion(false); setCompletionAcknowledged(false); setGuidance(null); setGraphSelected(next.entities[0]?.id); setPlayer({ position: next.world2d ? [next.world2d.spawn.x, 0, next.world2d.spawn.y] : next.spawn, yaw: 0, facing: 'away', moving: false }); setScreen('world');
    const url = new URL(location.href); url.searchParams.set('content', id); history.replaceState({}, '', url);
  }, [controller]);

  const handleZone = useCallback((zone) => {
    if (zone?.id === lastZone.current?.id) return;
    lastZone.current = zone; setCurrentZone(zone);
    if (!zone) return;
    const current = progressStore.load(pack.id);
    const action = getZoneNarrationAction(current, zone.id, controller.getState().status === 'playing');
    progressStore.visitZone(pack.id, zone.id); refreshProgress();
    if (pack.id !== 'naval-almanack' && action === 'auto-play') playNarration(zone, 'zone');
    if (action === 'show-title') setToast(`${zone.name}已发现，当前讲解结束后可主动播放`);
  }, [controller, pack.id, playNarration, refreshProgress]);

  const handleDiscover = useCallback((entity) => {
    const current = progressStore.load(pack.id);
    if (!current.discovered.includes(entity.id)) {
      progressStore.discover(pack.id, entity.id); refreshProgress(); setToast(`发现新${entity.type === 'knowledge' ? '知识' : '线索'}：${entity.title}`);
    }
  }, [pack.id, refreshProgress]);
  const handleNear = useCallback((entity) => { nearbyRef.current = entity; setNearby((prev) => prev?.id === entity?.id ? prev : entity); }, []);
  const openDetail = useCallback((entity) => {
    if (!entity?.interaction?.enabled) { setToast(entity ? `${entity.title}已收录，打开关系图可以查看线索` : '请先靠近发光的互动节点'); return; }
    controller.pause(); progressStore.deepen(pack.id, entity.id); refreshProgress(); setDetail(entity); setGuidance((value) => value?.id === entity.id ? null : value);
  }, [controller, pack.id, refreshProgress]);
  const interactNearby = useCallback(() => openDetail(nearbyRef.current), [openDetail]);
  const handlePropClick = useCallback((entity) => {
    if (nearbyRef.current?.id === entity.id) openDetail(entity); else setToast(`再靠近「${entity.title}」一些`);
  }, [openDetail]);
  const handlePlayerUpdate = useCallback((next) => setPlayer(next), []);
  const cinematic = pack.id === 'naval-almanack';
  const routeProgress = cinematic ? getRouteProgress(pack.world2d.route, progress.deepened) : null;
  const nextRouteEntity = routeProgress?.nextId ? pack.entities.find((entity) => entity.id === routeProgress.nextId) : null;

  useEffect(() => {
    const key = (event) => {
      if (event.key === 'Escape') { setDetail(null); setShowGraph(false); setShowHelp(false); }
      if (event.key.toLowerCase() === 'g' && screen === 'world' && !detail && !showHelp) setShowGraph((value) => !value);
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [detail, screen, showHelp]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 2800); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    if (screen === 'world' && routeProgress?.done && !completionAcknowledged && !detail && !showGraph && !showHelp) setShowCompletion(true);
  }, [completionAcknowledged, detail, routeProgress?.done, screen, showGraph, showHelp]);

  if (screen === 'entry') return <EntryScreen packs={contentPacks} initialId={pack.id} onEnter={enterPack} />;
  const paused = Boolean(detail || showGraph || showHelp || showCompletion);
  const discoveredCount = progress.discovered.length;
  return <main className="world-screen" style={{ '--accent': pack.theme.accent, '--ink': pack.theme.ink }}>
    <output data-testid="player-position" hidden>{JSON.stringify(player.position)}</output>
    <output data-testid="world-state" hidden>{JSON.stringify({ packId: pack.id, zoneId: currentZone?.id || null, nearbyId: nearby?.id || null, discovered: progress.discovered, deepened: progress.deepened, guidanceId: guidance?.id || null, facing: player.facing || null, moving: player.moving || false })}</output>
    {cinematic ? <PhaserWorld pack={pack} paused={paused} unlockAll={routeProgress.done} onZone={handleZone} onDiscover={handleDiscover} onNear={handleNear} onInteract={openDetail} onGuidance={(entity) => setGuidance(entity ? { id: entity.id, position: [entity.world2d.x, 0, entity.world2d.y], label: entity.title } : null)} onNotice={setToast} onPlayerUpdate={handlePlayerUpdate} resetSignal={resetSignal} /> : <WorldCanvas pack={pack} paused={paused} nearby={nearby} guidance={guidance} onZone={handleZone} onDiscover={handleDiscover} onNear={handleNear} onInteract={interactNearby} onPropClick={handlePropClick} onPlayerUpdate={handlePlayerUpdate} resetSignal={resetSignal} />}
    <header className="world-hud top"><button className="brand world-brand" onClick={() => { controller.stop(); setScreen('entry'); }}><span className="brand-seal">书</span><span><b>{pack.worldName}</b><small>{pack.title}</small></span></button><div className="hud-actions"><span className="audio-placeholder">● 文字讲解已就绪</span><button onClick={() => setShowHelp(true)}>？ 操作</button><button className="graph-button" onClick={() => setShowGraph(true)}>⌘ {pack.graphMode === 'character' ? '人物关系' : '知识图谱'} <span>{discoveredCount}/{pack.entities.length}</span></button></div></header>
    <aside className="quest-card"><span className="eyebrow">CURRENT JOURNEY</span><h2>{cinematic ? pack.world2d.routeTitle : (currentZone?.name || '中央入口广场')}</h2><p>{cinematic ? (nextRouteEntity ? `下一站：${nextRouteEntity.world2d.label}。走近发光节点，按 E 开始学习。` : '路线已经完成，可以继续自由探索。') : (currentZone ? currentZone.landmark : '沿着道路，选择一个知识区域开始探索。')}</p><div className="quest-progress"><span style={{ width: `${cinematic ? routeProgress.ratio * 100 : (discoveredCount / pack.entities.length) * 100}%` }} /></div><small>{cinematic ? `已完成 ${routeProgress.completed}/${routeProgress.total} 个核心知识点` : `已发现 ${discoveredCount} · 已深入 ${progress.deepened.length}`}</small></aside>
    <div className="mini-compass"><span>N</span><i style={{ transform: `rotate(${player.yaw}rad)` }}>↑</i></div>
    {nearby && <button className="interaction-prompt" onClick={interactNearby}><kbd>E</kbd><span><small>{nearby.interaction?.enabled ? '可以互动' : '知识线索'}</small><strong>{nearby.interaction?.enabled ? `查看「${nearby.title}」` : `发现「${nearby.title}」`}</strong></span></button>}
    {currentZone && !cinematic && <div className="zone-toast"><span style={{ background: currentZone.color }} /> <div><small>你正在探索</small><strong>{currentZone.name}</strong></div><button onClick={() => playNarration(currentZone, 'zone')}>{progress.playedNarrations.includes(`zone:${currentZone.id}`) ? '重新聆听' : '播放介绍'}</button></div>}
    {guidance && <div className="guidance"><i>◎</i><div><small>路线已标记</small><strong>{guidance.label}</strong></div><button onClick={() => setGuidance(null)}>结束</button></div>}
    {(audioState.text && audioState.status !== 'idle') && <div className="captions"><span className={`audio-dot ${audioState.status}`} /><p>{audioState.text}</p><button onClick={() => controller.stop()}>关闭</button></div>}
    <div className="control-hint"><span><kbd>WASD</kbd> 移动</span><span>点击道路 自动行走</span><span><kbd>E</kbd> 互动</span><button onClick={() => setResetSignal((v) => v + 1)}><kbd>R</kbd> 返回道路</button></div>
    {toast && <div className="system-toast">{toast}</div>}
    {detail && <div className="overlay"><DetailModal entity={detail} zone={pack.zones.find((z) => z.id === detail.zoneId)} onClose={() => setDetail(null)} onPlay={playNarration} /></div>}
    {showHelp && <div className="overlay"><HelpModal onClose={() => setShowHelp(false)} /></div>}
    {showCompletion && cinematic && <div className="overlay"><CompletionModal pack={pack} onClose={() => { setShowCompletion(false); setCompletionAcknowledged(true); }} onGraph={() => { setShowCompletion(false); setCompletionAcknowledged(true); setShowGraph(true); }} /></div>}
    {showGraph && <div className="overlay graph-overlay"><RelationshipGraph pack={pack} progress={progress} selectedId={graphSelected || pack.entities[0].id} onSelect={setGraphSelected} onClose={() => setShowGraph(false)} onGuide={(entity) => { const point = cinematic ? [entity.world2d.x, 0, entity.world2d.y] : entity.position; setGuidance({ id: entity.id, position: point, label: entity.title }); setShowGraph(false); }} onOpenDetail={(entity) => { setShowGraph(false); openDetail(entity); }} /></div>}
  </main>;
}
