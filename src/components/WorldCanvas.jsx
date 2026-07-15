import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Float, Html, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';

const temp = new THREE.Vector3();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();

function v3(position) { return new THREE.Vector3(position[0], position[1], position[2]); }

function isBlocked(position, pack) {
  const limit = pack.world.bounds;
  if (Math.abs(position.x) > limit || Math.abs(position.z) > limit) return true;
  for (const obstacle of pack.world.obstacles || []) {
    const [x, , z] = obstacle.position;
    const [w, , d] = obstacle.size;
    if (Math.abs(position.x - x) < w / 2 + 0.7 && Math.abs(position.z - z) < d / 2 + 0.7) return true;
  }
  for (let index = 0; index < pack.zones.length; index += 1) {
    const zone = pack.zones[index];
    const dx = position.x - zone.center[0]; const dz = position.z - zone.center[1];
    if (index < 2 && Math.abs(dx) < 4.2 && Math.abs(dz) < 3.2) return true;
    if (index === 2 && Math.hypot(dx, dz) < 5.2) return true;
  }
  for (const entity of pack.entities) {
    const radius = ['pavilion', 'bookshelf', 'gate', 'character'].includes(entity.propType) ? 1.7 : 1.05;
    if (Math.hypot(position.x - entity.position[0], position.z - entity.position[2]) < radius) return true;
  }
  return false;
}

function Player({ pack, paused, onZone, onDiscover, onNear, onInteract, onUpdate, resetSignal }) {
  const group = useRef();
  const body = useRef();
  const leftArm = useRef();
  const rightArm = useRef();
  const leftLeg = useRef();
  const rightLeg = useRef();
  const keys = useRef(new Set());
  const safe = useRef(v3(pack.spawn));
  const yaw = useRef(0);
  const pitch = useRef(0.26);
  const distance = useRef(7.5);
  const drag = useRef(false);
  const lastSense = useRef(0);
  const { camera, gl } = useThree();

  useEffect(() => {
    const down = (event) => {
      if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(event.target?.tagName)) return;
      keys.current.add(event.key.toLowerCase());
      if (event.key.toLowerCase() === 'r') group.current.position.copy(safe.current);
      if (event.key.toLowerCase() === 'e') onInteract();
    };
    const up = (event) => keys.current.delete(event.key.toLowerCase());
    const pointerDown = (event) => { if (event.target === gl.domElement) drag.current = true; };
    const pointerUp = () => { drag.current = false; };
    const pointerMove = (event) => {
      if (!drag.current || paused) return;
      yaw.current -= event.movementX * 0.005;
      pitch.current = THREE.MathUtils.clamp(pitch.current + event.movementY * 0.003, 0.05, 0.65);
    };
    const wheel = (event) => {
      if (event.target !== gl.domElement) return;
      distance.current = THREE.MathUtils.clamp(distance.current + event.deltaY * 0.006, 5.2, 10.5);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('pointerdown', pointerDown);
    window.addEventListener('pointerup', pointerUp);
    window.addEventListener('pointermove', pointerMove);
    window.addEventListener('wheel', wheel, { passive: true });
    return () => {
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up);
      window.removeEventListener('pointerdown', pointerDown); window.removeEventListener('pointerup', pointerUp);
      window.removeEventListener('pointermove', pointerMove); window.removeEventListener('wheel', wheel);
    };
  }, [gl, paused, onInteract]);

  useEffect(() => { if (group.current) { group.current.position.copy(v3(pack.spawn)); safe.current.copy(v3(pack.spawn)); } }, [pack]);
  useEffect(() => { if (group.current) group.current.position.copy(safe.current); }, [resetSignal]);

  useFrame((state, delta) => {
    if (!group.current) return;
    let moving = false;
    if (!paused) {
      const x = (keys.current.has('d') || keys.current.has('arrowright') ? 1 : 0) - (keys.current.has('a') || keys.current.has('arrowleft') ? 1 : 0);
      const z = (keys.current.has('w') || keys.current.has('arrowup') ? 1 : 0) - (keys.current.has('s') || keys.current.has('arrowdown') ? 1 : 0);
      if (x || z) {
        moving = true;
        forward.set(Math.sin(yaw.current), 0, Math.cos(yaw.current)).multiplyScalar(-z);
        right.set(Math.cos(yaw.current), 0, -Math.sin(yaw.current)).multiplyScalar(x);
        temp.copy(forward).add(right).normalize().multiplyScalar(Math.min(delta, 0.04) * 6.2);
        const candidate = group.current.position.clone().add(temp);
        if (!isBlocked(candidate, pack)) {
          group.current.position.copy(candidate);
          safe.current.copy(candidate);
          body.current.rotation.y = Math.atan2(temp.x, temp.z);
        }
      }
    }
    const swing = moving ? Math.sin(state.clock.elapsedTime * 10) * 0.58 : 0;
    leftArm.current.rotation.x = swing; rightArm.current.rotation.x = -swing;
    leftLeg.current.rotation.x = -swing; rightLeg.current.rotation.x = swing;
    body.current.position.y = moving ? Math.abs(Math.sin(state.clock.elapsedTime * 10)) * 0.05 : 0;

    const player = group.current.position;
    const cp = new THREE.Vector3(
      player.x + Math.sin(yaw.current) * distance.current * Math.cos(pitch.current),
      player.y + 2.2 + Math.sin(pitch.current) * distance.current,
      player.z + Math.cos(yaw.current) * distance.current * Math.cos(pitch.current),
    );
    camera.position.lerp(cp, 1 - Math.pow(0.002, delta));
    camera.lookAt(player.x, player.y + 1.2, player.z);

    if (state.clock.elapsedTime - lastSense.current > 0.12) {
      lastSense.current = state.clock.elapsedTime;
      const currentZone = pack.zones.find((zone) => Math.hypot(player.x - zone.center[0], player.z - zone.center[1]) < zone.radius);
      onZone(currentZone || null);
      let nearest = null; let nearestDistance = Infinity;
      for (const entity of pack.entities) {
        const d = Math.hypot(player.x - entity.position[0], player.z - entity.position[2]);
        if (d < entity.discover.radius) onDiscover(entity);
        if (d < 4.7 && d < nearestDistance) { nearest = entity; nearestDistance = d; }
      }
      onNear(nearest);
      onUpdate({ position: [player.x, player.y, player.z], yaw: yaw.current });
    }
  });

  return (
    <group ref={group} position={pack.spawn}>
      <group ref={body}>
        <mesh position={[0, 1.55, 0]} castShadow><capsuleGeometry args={[0.34, 0.75, 6, 10]} /><meshStandardMaterial color="#263d3a" roughness={0.8} /></mesh>
        <mesh position={[0, 2.45, 0]} castShadow><sphereGeometry args={[0.32, 16, 12]} /><meshStandardMaterial color="#d6aa82" /></mesh>
        <mesh position={[0, 2.52, -0.04]} castShadow><sphereGeometry args={[0.34, 16, 8, 0, Math.PI * 2, 0, 1.25]} /><meshStandardMaterial color="#182421" /></mesh>
        <group ref={leftArm} position={[-0.46, 1.78, 0]}><mesh position={[0, -0.36, 0]} castShadow><capsuleGeometry args={[0.12, 0.55, 5, 8]} /><meshStandardMaterial color="#263d3a" /></mesh></group>
        <group ref={rightArm} position={[0.46, 1.78, 0]}><mesh position={[0, -0.36, 0]} castShadow><capsuleGeometry args={[0.12, 0.55, 5, 8]} /><meshStandardMaterial color="#263d3a" /></mesh></group>
        <group ref={leftLeg} position={[-0.2, 0.82, 0]}><mesh position={[0, -0.42, 0]} castShadow><capsuleGeometry args={[0.14, 0.65, 5, 8]} /><meshStandardMaterial color="#172522" /></mesh></group>
        <group ref={rightLeg} position={[0.2, 0.82, 0]}><mesh position={[0, -0.42, 0]} castShadow><capsuleGeometry args={[0.14, 0.65, 5, 8]} /><meshStandardMaterial color="#172522" /></mesh></group>
      </group>
    </group>
  );
}

function Tree({ position, tint = '#547053', scale = 1 }) {
  return <group position={position} scale={scale}>
    <mesh position={[0, 1.2, 0]} castShadow><cylinderGeometry args={[0.16, 0.26, 2.4, 7]} /><meshStandardMaterial color="#6c503a" /></mesh>
    <mesh position={[0, 2.75, 0]} castShadow><dodecahedronGeometry args={[1.05, 0]} /><meshStandardMaterial color={tint} roughness={1} /></mesh>
    <mesh position={[0.65, 2.45, 0.15]} castShadow><dodecahedronGeometry args={[0.72, 0]} /><meshStandardMaterial color={tint} roughness={1} /></mesh>
  </group>;
}

function Building({ position, size, color = '#d8c7a1', roof = '#384b46' }) {
  return <group position={position}>
    <mesh position={[0, size[1] / 2, 0]} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.92} /></mesh>
    <mesh position={[0, size[1] + 0.45, 0]} castShadow rotation={[0, Math.PI / 4, 0]}><cylinderGeometry args={[0, Math.max(size[0], size[2]) * 0.72, 0.9, 4]} /><meshStandardMaterial color={roof} /></mesh>
    <mesh position={[0, 1.15, size[2] / 2 + 0.02]}><planeGeometry args={[1.25, 2.25]} /><meshStandardMaterial color="#4c3a2d" /></mesh>
    {[-1, 1].map((x) => <mesh key={x} position={[x * Math.min(1.8, size[0] / 3), size[1] * 0.62, size[2] / 2 + 0.03]}><planeGeometry args={[0.8, 0.95]} /><meshStandardMaterial color="#a9d0d0" emissive="#294645" emissiveIntensity={0.25} /></mesh>)}
  </group>;
}

function ZoneLandmark({ zone, index }) {
  const [x, z] = zone.center;
  if (index === 0) return <group position={[x, 0, z]}><Building position={[0, 0, 0]} size={[7, 4.2, 5]} color="#d6b17c" roof="#7f4e32" /><mesh position={[0, 5.4, 0]} castShadow><torusGeometry args={[1.2, 0.18, 8, 18]} /><meshStandardMaterial color={zone.accent} metalness={0.6} /></mesh></group>;
  if (index === 1) return <group position={[x, 0, z]}><Building position={[0, 0, 0]} size={[6.5, 5.5, 5]} color="#aebdbe" roof="#314e64" /><mesh position={[0, 7.1, 0]} castShadow><octahedronGeometry args={[0.9]} /><meshStandardMaterial color={zone.accent} emissive={zone.color} emissiveIntensity={0.25} /></mesh></group>;
  return <group position={[x, 0, z]}><mesh position={[0, 0.4, 0]} receiveShadow><cylinderGeometry args={[6, 6.5, 0.8, 32]} /><meshStandardMaterial color="#90a88d" /></mesh><mesh position={[0, 0.72, 0]}><cylinderGeometry args={[4.6, 4.6, 0.22, 32]} /><meshStandardMaterial color="#6da4a1" metalness={0.15} roughness={0.3} /></mesh><Float speed={1.4} floatIntensity={0.18}><mesh position={[0, 1.55, 0]}><icosahedronGeometry args={[0.85, 1]} /><meshStandardMaterial color={zone.accent} emissive={zone.color} emissiveIntensity={0.35} /></mesh></Float></group>;
}

function PropShape({ entity, color }) {
  const common = <meshStandardMaterial color={color} roughness={0.65} metalness={0.12} />;
  switch (entity.propType) {
    case 'lever': return <group><mesh rotation={[0, 0, -0.65]} position={[0, 1.25, 0]} castShadow><boxGeometry args={[0.25, 3.6, 0.25]} />{common}</mesh><mesh position={[0, 0.25, 0]} castShadow><cylinderGeometry args={[0.8, 1.05, 0.5, 8]} />{common}</mesh><mesh position={[-1.1, 2.5, 0]} castShadow><sphereGeometry args={[0.42, 12, 8]} />{common}</mesh></group>;
    case 'hourglass': return <group><mesh position={[0, 1.15, 0]} castShadow><cylinderGeometry args={[0.7, 0.2, 1.7, 12]} /><meshStandardMaterial color="#d8b06e" transparent opacity={0.7} /></mesh><mesh position={[0, 1.15, 0]} rotation={[Math.PI, 0, 0]} castShadow><cylinderGeometry args={[0.7, 0.2, 1.7, 12]} /><meshStandardMaterial color="#d8b06e" transparent opacity={0.7} /></mesh><mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.9, 0.9, 0.18, 16]} />{common}</mesh><mesh position={[0, 2.05, 0]}><cylinderGeometry args={[0.9, 0.9, 0.18, 16]} />{common}</mesh></group>;
    case 'bookshelf': return <group><mesh position={[0, 1.5, 0]} castShadow><boxGeometry args={[2.5, 3, 0.6]} /><meshStandardMaterial color="#684a35" /></mesh>{[-0.75, -0.25, 0.25, 0.75].map((x) => <mesh key={x} position={[x, 1.45, -0.34]}><boxGeometry args={[0.34, 1.8, 0.24]} /><meshStandardMaterial color={x > 0 ? '#b9824d' : '#4d7581'} /></mesh>)}</group>;
    case 'scale': return <group><mesh position={[0, 1.5, 0]}><cylinderGeometry args={[0.12, 0.25, 3, 8]} />{common}</mesh><mesh position={[0, 2.65, 0]}><boxGeometry args={[3, 0.14, 0.18]} />{common}</mesh>{[-1.25, 1.25].map((x) => <mesh key={x} position={[x, 1.9, 0]}><cylinderGeometry args={[0.65, 0.4, 0.18, 16]} /><meshStandardMaterial color="#c7a35d" /></mesh>)}</group>;
    case 'well': return <group><mesh position={[0, 0.62, 0]}><cylinderGeometry args={[1.15, 1.3, 1.25, 16]} /><meshStandardMaterial color="#9a9a83" /></mesh><mesh position={[0, 1.08, 0]}><cylinderGeometry args={[0.82, 0.82, 0.05, 16]} /><meshStandardMaterial color="#5c929c" /></mesh></group>;
    case 'bench': return <group><mesh position={[0, 0.75, 0]} castShadow><boxGeometry args={[2.3, 0.16, 0.65]} />{common}</mesh><mesh position={[0, 1.25, 0.28]} rotation={[-0.12, 0, 0]}><boxGeometry args={[2.3, 0.85, 0.14]} />{common}</mesh></group>;
    case 'gate': return <group>{[-1.25, 1.25].map((x) => <mesh key={x} position={[x, 1.7, 0]}><boxGeometry args={[0.5, 3.4, 0.7]} />{common}</mesh>)}<mesh position={[0, 3.25, 0]}><boxGeometry args={[3, 0.45, 0.8]} />{common}</mesh></group>;
    case 'character': return <group><mesh position={[0, 1.25, 0]}><capsuleGeometry args={[0.36, 1.2, 6, 10]} />{common}</mesh><mesh position={[0, 2.2, 0]}><sphereGeometry args={[0.38, 12, 10]} /><meshStandardMaterial color="#c99c7a" /></mesh></group>;
    case 'letter': return <group><mesh position={[0, 1, 0]} rotation={[-0.3, 0.2, 0]}><boxGeometry args={[1.5, 0.08, 1]} /><meshStandardMaterial color="#e9dfc7" /></mesh><mesh position={[0, 0.35, 0]}><boxGeometry args={[2, 0.7, 1.5]} /><meshStandardMaterial color="#5b4638" /></mesh></group>;
    case 'pavilion': return <Building position={[0, 0, 0]} size={[3.3, 2.8, 3.3]} color="#bfc3a2" roof="#4e6953" />;
    default: return <group><mesh position={[0, 0.8, 0]} castShadow><dodecahedronGeometry args={[0.9, 0]} />{common}</mesh><mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.8, 1, 0.4, 8]} />{common}</mesh></group>;
  }
}

function KnowledgeProp({ entity, zone, nearby, guided, onClick, hideLabel }) {
  const active = nearby || guided;
  return <group position={entity.position} onClick={(event) => { event.stopPropagation(); onClick(entity); }}>
    <Float speed={active ? 2.2 : 1.1} floatIntensity={active ? 0.18 : 0.04}>
      <group scale={active ? 1.08 : 1}><PropShape entity={entity} color={active ? zone.accent : zone.color} /></group>
      <mesh position={[0, 3.1, 0]}><octahedronGeometry args={[active ? 0.35 : 0.22]} /><meshStandardMaterial color={zone.accent} emissive={zone.color} emissiveIntensity={active ? 1.2 : 0.35} /></mesh>
    </Float>
    {active && <pointLight position={[0, 2.3, 0]} color={zone.accent} intensity={1.5} distance={7} />}
    {!hideLabel && <Html center position={[0, 3.75, 0]} distanceFactor={12} style={{ pointerEvents: 'none' }}><div className={`world-label ${active ? 'active' : ''}`}>{entity.title}</div></Html>}
  </group>;
}

function World({ pack, nearbyId, guidance, onPropClick, hideLabels }) {
  const trees = useMemo(() => Array.from({ length: 34 }, (_, index) => {
    const angle = (index / 34) * Math.PI * 2 + (index % 3) * 0.14;
    const radius = 27 + (index % 5) * 1.7;
    return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius - 4, 0.72 + (index % 4) * 0.1];
  }), []);
  return <>
    <color attach="background" args={[pack.theme.sky]} /><fog attach="fog" args={[pack.theme.fog, 30, 76]} />
    <ambientLight intensity={1.15} /><hemisphereLight args={['#d8eced', '#56604e', 1.4]} />
    <directionalLight position={[15, 24, 12]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-far={70} shadow-camera-left={-35} shadow-camera-right={35} shadow-camera-top={35} shadow-camera-bottom={-35} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[pack.world.bounds + 5, 64]} /><meshStandardMaterial color={pack.theme.ground} roughness={0.96} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]} receiveShadow><circleGeometry args={[8.8, 40]} /><meshStandardMaterial color="#cbbd99" /></mesh>
    {pack.zones.map((zone, index) => <group key={zone.id}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[zone.center[0], 0.035, zone.center[1]]}><circleGeometry args={[zone.radius * 0.75, 40]} /><meshStandardMaterial color={zone.color} transparent opacity={0.3} /></mesh>
      <ZoneLandmark zone={zone} index={index} />
      {!hideLabels && <Html center position={[zone.center[0], index === 1 ? 7.8 : 6.5, zone.center[1]]} distanceFactor={16} style={{ pointerEvents: 'none' }}><div className="zone-sign"><span>{String(index + 1).padStart(2, '0')}</span>{zone.name}<small>{zone.landmark}</small></div></Html>}
    </group>)}
    {pack.zones.map((zone) => <mesh key={`road-${zone.id}`} rotation={[-Math.PI / 2, 0, Math.atan2(zone.center[0], zone.center[1])]} position={[zone.center[0] / 2, 0.05, zone.center[1] / 2]} receiveShadow><planeGeometry args={[3.3, Math.hypot(...zone.center)]} /><meshStandardMaterial color="#c8bb99" roughness={1} /></mesh>)}
    {pack.world.obstacles.map((obstacle, index) => obstacle.kind === 'archive' ? <Building key={index} position={obstacle.position} size={obstacle.size} /> : <mesh key={index} position={obstacle.position} castShadow receiveShadow><boxGeometry args={obstacle.size} /><meshStandardMaterial color="#718169" roughness={1} /></mesh>)}
    {trees.map(([x, y, z, scale], index) => <Tree key={index} position={[x, y, z]} tint={index % 2 ? '#4f7556' : '#678360'} scale={scale} />)}
    {pack.entities.map((entity) => <KnowledgeProp key={entity.id} entity={entity} zone={pack.zones.find((z) => z.id === entity.zoneId)} nearby={nearbyId === entity.id} guided={guidance?.id === entity.id} onClick={onPropClick} hideLabel={hideLabels} />)}
    <Sparkles count={50} scale={[48, 8, 48]} size={1.5} speed={0.18} opacity={0.28} color={pack.theme.accent} />
    <ContactShadows position={[0, 0.08, 0]} opacity={0.35} scale={68} blur={2.5} far={18} resolution={512} />
  </>;
}

export function WorldCanvas({ pack, paused, nearby, guidance, onZone, onDiscover, onNear, onInteract, onPropClick, onPlayerUpdate, resetSignal }) {
  return <Canvas className="world-canvas" shadows="basic" dpr={[1, 1.5]} camera={{ position: [0, 8, 18], fov: 48, near: 0.1, far: 120 }} gl={{ antialias: true, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.domElement.dataset.testid = 'world-canvas'; gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}>
    <Suspense fallback={null}>
      <World pack={pack} nearbyId={nearby?.id} guidance={guidance} onPropClick={onPropClick} hideLabels={paused} />
      <Player key={pack.id} pack={pack} paused={paused} onZone={onZone} onDiscover={onDiscover} onNear={onNear} onInteract={onInteract} onUpdate={onPlayerUpdate} resetSignal={resetSignal} />
    </Suspense>
  </Canvas>;
}
