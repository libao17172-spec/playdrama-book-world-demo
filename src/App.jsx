import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { contentPacks, getContentPack } from './content/index.js';
import { createProgressStore } from './core/progress-store.js';
import { createNarrationController } from './core/narration-controller.js';
import { getZoneNarrationAction } from './core/zone-policy.js';
import { EntryScreen } from './components/EntryScreen.jsx';
import { RelationshipGraph } from './components/RelationshipGraph.jsx';
import { WorldCanvas } from './components/WorldCanvas.jsx';

const progressStore = typeof window !== 'undefined' ? createProgressStore(window.localStorage) : null;
const navalBackground = `${import.meta.env.BASE_URL}assets/backgrounds/naval-world-background-v1.png`;
const navalPlayer = `${import.meta.env.BASE_URL}assets/characters/victorian-player-walkcycle-v1.png`;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function DetailModal({ entity, zone, onClose, onPlay }) {
  return <div className="modal detail-modal" role="dialog" aria-label={`${entity.title}知识详情`}>
    <div className="detail-visual" style={{ '--detail-color': zone.color }}><span className="detail-orbit" /><div className="detail-glyph">{entity.title.slice(0, 1)}</div><small>{zone.name} · {entity.type.toUpperCase()}</small></div>
    <div className="detail-content"><button className="icon-button detail-close" onClick={onClose} aria-label="关闭详情">×</button><span className="eyebrow">深入探索 / DEEP DIVE</span><h2>{entity.title}</h2><blockquote>{entity.summary}</blockquote><p>{entity.detail || entity.summary}</p><div className="source-box"><span>内容出处</span><p>{entity.source}</p></div><div className="detail-actions"><button className="primary-button compact" onClick={() => onPlay(entity)}>显示讲解文字 <span>文</span></button><button className="ghost-button" onClick={onClose}>返回世界</button></div><small className="voice-note">豆包语音接口已预留，取得模型权限后接入。</small></div>
  </div>;
}

function HelpModal({ onClose }) {
  return <div className="modal help-modal" role="dialog" aria-label="操作说明"><button className="icon-button detail-close" onClick={onClose}>×</button><span className="eyebrow">HOW TO EXPLORE</span><h2>如何探索书境</h2><div className="control-grid"><div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><strong>移动角色</strong><p>方向键同样可用</p></div><div><i className="mouse-icon">↔</i><strong>拖动镜头</strong><p>滚轮调整远近</p></div><div><kbd>E</kbd><strong>互动</strong><p>靠近发光节点后触发</p></div><div><kbd>R</kbd><strong>返回道路</strong><p>卡住时回到安全位置</p></div></div><p className="help-note">按 <kbd>G</kbd> 或点击右上角按钮打开关系图，按 <kbd>Esc</kbd> 关闭当前界面。</p></div>;
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
  const [graphSelected, setGraphSelected] = useState(null);
  const [guidance, setGuidance] = useState(null);
  const [player, setPlayer] = useState({ position: pack.spawn, yaw: 0 });
  const [playerMoving, setPlayerMoving] = useState(false);
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
    setNearby(null); nearbyRef.current = null; setCurrentZone(null); lastZone.current = null; setDetail(null); setShowGraph(false); setGuidance(null); setGraphSelected(next.entities[0]?.id); setScreen('world');
    const url = new URL(location.href); url.searchParams.set('content', id); history.replaceState({}, '', url);
  }, [controller]);

  const handleZone = useCallback((zone) => {
    if (zone?.id === lastZone.current?.id) return;
    lastZone.current = zone; setCurrentZone(zone);
    if (!zone) return;
    const current = progressStore.load(pack.id);
    const action = getZoneNarrationAction(current, zone.id, controller.getState().status === 'playing');
    progressStore.visitZone(pack.id, zone.id); refreshProgress();
    if (action === 'auto-play') playNarration(zone, 'zone');
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

  useEffect(() => {
    const key = (event) => {
      if (event.key === 'Escape') { setDetail(null); setShowGraph(false); setShowHelp(false); }
      if (event.key.toLowerCase() === 'g' && screen === 'world' && !detail && !showHelp) setShowGraph((value) => !value);
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [detail, screen, showHelp]);
  useEffect(() => {
    const movementKeys = new Set();
    const moveKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
    const down = (event) => { const key = event.key.toLowerCase(); if (moveKeys.has(key)) { movementKeys.add(key); setPlayerMoving(true); } };
    const up = (event) => { movementKeys.delete(event.key.toLowerCase()); if (!movementKeys.size) setPlayerMoving(false); };
    const stop = () => { movementKeys.clear(); setPlayerMoving(false); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', stop);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', stop); };
  }, []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 2800); return () => clearTimeout(timer); }, [toast]);

  if (screen === 'entry') return <EntryScreen packs={contentPacks} initialId={pack.id} onEnter={enterPack} />;
  const paused = Boolean(detail || showGraph || showHelp);
  const discoveredCount = progress.discovered.length;
  const targetAngle = guidance ? Math.atan2(guidance.position[0] - player.position[0], guidance.position[2] - player.position[2]) - player.yaw : 0;
  const cinematic = pack.id === 'naval-almanack';
  const sceneOffsetX = cinematic ? clamp(-(player.position[0] - pack.spawn[0]) * 0.16, -3.2, 3.2) : 0;
  const sceneDepth = cinematic ? clamp((pack.spawn[2] - player.position[2]) * 0.005, -0.015, 0.07) : 0;
  return <main className="world-screen" style={{ '--accent': pack.theme.accent, '--ink': pack.theme.ink }}>
    <output data-testid="player-position" hidden>{JSON.stringify(player.position)}</output>
    <output data-testid="world-state" hidden>{JSON.stringify({ packId: pack.id, zoneId: currentZone?.id || null, nearbyId: nearby?.id || null, discovered: progress.discovered, deepened: progress.deepened, guidanceId: guidance?.id || null })}</output>
    {cinematic && <div className="cinematic-backdrop" aria-hidden="true" style={{ backgroundImage: `url(${navalBackground})`, transform: `translate3d(${sceneOffsetX}%, 0, 0) scale(${1.035 + sceneDepth})` }} />}
    <WorldCanvas pack={pack} paused={paused} nearby={nearby} guidance={guidance} onZone={handleZone} onDiscover={handleDiscover} onNear={handleNear} onInteract={interactNearby} onPropClick={handlePropClick} onPlayerUpdate={setPlayer} resetSignal={resetSignal} cinematic={cinematic} />
    {cinematic && <div className={`cinematic-player ${playerMoving ? 'moving' : ''}`} data-testid="cinematic-player" data-moving={playerMoving ? 'true' : 'false'} aria-hidden="true"><div className="cinematic-player-sprite" style={{ backgroundImage: `url(${navalPlayer})` }} /></div>}
    {cinematic && <div className="cinematic-hotspots" aria-label="场景知识节点">
      <button className="scene-hotspot scene-hotspot-clock" onClick={() => openDetail(pack.entities[8])}><i /> <span>欲望</span></button>
      <button className="scene-hotspot scene-hotspot-library" onClick={() => openDetail(pack.entities[5])}><i /> <span>阅读</span></button>
      <button className="scene-hotspot scene-hotspot-workshop" onClick={() => openDetail(pack.entities[0])}><i /> <span>专长</span></button>
    </div>}
    <header className="world-hud top"><button className="brand world-brand" onClick={() => { controller.stop(); setScreen('entry'); }}><span className="brand-seal">书</span><span><b>{pack.worldName}</b><small>{pack.title}</small></span></button><div className="hud-actions"><span className="audio-placeholder">◌ 豆包语音待接入</span><button onClick={() => setShowHelp(true)}>？ 操作</button><button className="graph-button" onClick={() => setShowGraph(true)}>⌘ {pack.graphMode === 'character' ? '人物关系' : '知识图谱'} <span>{discoveredCount}/{pack.entities.length}</span></button></div></header>
    <aside className="quest-card"><span className="eyebrow">CURRENT JOURNEY</span><h2>{currentZone?.name || '中央入口广场'}</h2><p>{currentZone ? currentZone.landmark : '沿着道路，选择一个知识区域开始探索。'}</p><div className="quest-progress"><span style={{ width: `${(discoveredCount / pack.entities.length) * 100}%` }} /></div><small>已发现 {discoveredCount} · 已深入 {progress.deepened.length}</small></aside>
    <div className="mini-compass"><span>N</span><i style={{ transform: `rotate(${player.yaw}rad)` }}>↑</i></div>
    {nearby && <button className="interaction-prompt" onClick={interactNearby}><kbd>E</kbd><span><small>{nearby.interaction?.enabled ? '可以互动' : '知识线索'}</small><strong>{nearby.interaction?.enabled ? `查看「${nearby.title}」` : `发现「${nearby.title}」`}</strong></span></button>}
    {currentZone && <div className="zone-toast"><span style={{ background: currentZone.color }} /> <div><small>你正在探索</small><strong>{currentZone.name}</strong></div><button onClick={() => playNarration(currentZone, 'zone')}>{progress.playedNarrations.includes(`zone:${currentZone.id}`) ? '重新聆听' : '播放介绍'}</button></div>}
    {guidance && <div className="guidance" style={{ '--arrow-angle': `${targetAngle}rad` }}><i>↑</i><div><small>正在前往</small><strong>{guidance.label}</strong></div><button onClick={() => setGuidance(null)}>结束</button></div>}
    {(audioState.text && audioState.status !== 'idle') && <div className="captions"><span className={`audio-dot ${audioState.status}`} /><p>{audioState.text}</p><button onClick={() => controller.stop()}>关闭</button></div>}
    <div className="control-hint"><span><kbd>WASD</kbd> 移动</span><span>拖动鼠标 镜头</span><span><kbd>E</kbd> 互动</span><button onClick={() => { setResetSignal((v) => v + 1); setToast('已返回最近安全位置'); }}><kbd>R</kbd> 返回道路</button></div>
    {toast && <div className="system-toast">{toast}</div>}
    {detail && <div className="overlay"><DetailModal entity={detail} zone={pack.zones.find((z) => z.id === detail.zoneId)} onClose={() => setDetail(null)} onPlay={playNarration} /></div>}
    {showHelp && <div className="overlay"><HelpModal onClose={() => setShowHelp(false)} /></div>}
    {showGraph && <div className="overlay graph-overlay"><RelationshipGraph pack={pack} progress={progress} selectedId={graphSelected || pack.entities[0].id} onSelect={setGraphSelected} onClose={() => setShowGraph(false)} onGuide={(entity) => { setGuidance({ id: entity.id, position: entity.position, label: entity.title }); setShowGraph(false); }} onOpenDetail={(entity) => { setShowGraph(false); openDetail(entity); }} /></div>}
  </main>;
}
