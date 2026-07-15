import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Float, Html, Sky } from '@react-three/drei';
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
  const pitch = useRef(0.1);
  const distance = useRef(9.5);
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
      pitch.current = THREE.MathUtils.clamp(pitch.current + event.movementY * 0.003, -0.04, 0.48);
    };
    const wheel = (event) => {
      if (event.target !== gl.domElement) return;
      distance.current = THREE.MathUtils.clamp(distance.current + event.deltaY * 0.006, 7.2, 13.5);
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
    const swing = moving ? Math.sin(state.clock.elapsedTime * 9) * 0.42 : 0;
    leftArm.current.rotation.x = swing; rightArm.current.rotation.x = -swing;
    leftLeg.current.rotation.x = -swing; rightLeg.current.rotation.x = swing;
    body.current.position.y = -0.82 + (moving ? Math.abs(Math.sin(state.clock.elapsedTime * 9)) * 0.025 : 0);

    const player = group.current.position;
    const cp = new THREE.Vector3(
      player.x + Math.sin(yaw.current) * distance.current * Math.cos(pitch.current),
      player.y + 1.3 + Math.sin(pitch.current) * distance.current,
      player.z + Math.cos(yaw.current) * distance.current * Math.cos(pitch.current),
    );
    camera.position.lerp(cp, 1 - Math.pow(0.002, delta));
    camera.lookAt(player.x, player.y + 1.05, player.z);

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
      <group ref={body} position={[0, -0.82, 0]}>
        <mesh position={[0, 1.43, 0]} scale={[0.82, 1.35, 0.58]} castShadow><capsuleGeometry args={[0.28, 0.55, 10, 18]} /><meshStandardMaterial color="#202827" roughness={0.92} /></mesh>
        <mesh position={[0, 0.88, 0.03]} scale={[1, 1.35, 0.72]} castShadow><cylinderGeometry args={[0.24, 0.36, 0.78, 12]} /><meshStandardMaterial color="#252d2c" roughness={0.96} /></mesh>
        <mesh position={[0, 1.71, -0.27]} castShadow><boxGeometry args={[0.5, 0.42, 0.035]} /><meshStandardMaterial color="#171d1c" roughness={0.9} /></mesh>
        <mesh position={[0, 2.15, 0]} scale={[0.86, 1.08, 0.9]} castShadow><sphereGeometry args={[0.2, 24, 18]} /><meshStandardMaterial color="#c48f69" roughness={0.9} /></mesh>
        <mesh position={[0, 2.22, 0.035]} scale={[0.9, 0.72, 0.92]} castShadow><sphereGeometry args={[0.215, 24, 16, 0, Math.PI * 2, 0, 1.5]} /><meshStandardMaterial color="#30251f" roughness={0.95} /></mesh>
        <mesh position={[0, 1.88, 0]} castShadow><cylinderGeometry args={[0.12, 0.13, 0.18, 16]} /><meshStandardMaterial color="#d9cfc0" roughness={0.85} /></mesh>
        <group ref={leftArm} position={[-0.31, 1.68, 0]}><mesh position={[0, -0.4, 0]} castShadow><capsuleGeometry args={[0.075, 0.66, 8, 12]} /><meshStandardMaterial color="#202827" roughness={0.92} /></mesh><mesh position={[0, -0.82, 0]} castShadow><sphereGeometry args={[0.085, 12, 10]} /><meshStandardMaterial color="#b77f5f" /></mesh></group>
        <group ref={rightArm} position={[0.31, 1.68, 0]}><mesh position={[0, -0.4, 0]} castShadow><capsuleGeometry args={[0.075, 0.66, 8, 12]} /><meshStandardMaterial color="#202827" roughness={0.92} /></mesh><mesh position={[0, -0.82, 0]} castShadow><sphereGeometry args={[0.085, 12, 10]} /><meshStandardMaterial color="#b77f5f" /></mesh></group>
        <group ref={leftLeg} position={[-0.14, 0.68, 0]}><mesh position={[0, -0.34, 0]} castShadow><capsuleGeometry args={[0.095, 0.58, 8, 12]} /><meshStandardMaterial color="#191e1e" roughness={0.9} /></mesh><mesh position={[0, -0.71, -0.055]} castShadow><boxGeometry args={[0.2, 0.13, 0.38]} /><meshStandardMaterial color="#171513" roughness={0.8} /></mesh></group>
        <group ref={rightLeg} position={[0.14, 0.68, 0]}><mesh position={[0, -0.34, 0]} castShadow><capsuleGeometry args={[0.095, 0.58, 8, 12]} /><meshStandardMaterial color="#191e1e" roughness={0.9} /></mesh><mesh position={[0, -0.71, -0.055]} castShadow><boxGeometry args={[0.2, 0.13, 0.38]} /><meshStandardMaterial color="#171513" roughness={0.8} /></mesh></group>
      </group>
    </group>
  );
}

function Tree({ position, tint = '#547053', scale = 1 }) {
  return <group position={position} scale={scale}>
    <mesh position={[0, 1.35, 0]} castShadow><cylinderGeometry args={[0.13, 0.24, 2.7, 10]} /><meshStandardMaterial color="#5b4230" roughness={1} /></mesh>
    {[[0, 2.85, 0, 1.02], [0.68, 2.7, 0.08, 0.72], [-0.58, 2.55, -0.1, 0.8], [0.15, 3.45, 0.05, 0.7]].map(([x, y, z, s], index) => <mesh key={index} position={[x, y, z]} scale={[s, s * 1.1, s]} castShadow><sphereGeometry args={[0.8, 14, 10]} /><meshStandardMaterial color={index % 2 ? tint : new THREE.Color(tint).offsetHSL(0, 0.03, 0.035)} roughness={1} /></mesh>)}
  </group>;
}

function FacadeWindow({ position, warm = false, balcony = false }) {
  return <group position={position}>
    <mesh position={[0, 0, 0.015]} castShadow><boxGeometry args={[0.94, 1.28, 0.13]} /><meshStandardMaterial color="#e8ddc7" roughness={0.88} /></mesh>
    <mesh position={[0, 0, 0.09]}><planeGeometry args={[0.7, 1.02]} /><meshStandardMaterial color={warm ? '#bd7d3c' : '#71878c'} emissive={warm ? '#ffb45d' : '#1f3438'} emissiveIntensity={warm ? 0.75 : 0.14} roughness={0.25} /></mesh>
    <mesh position={[0, 0, 0.17]}><boxGeometry args={[0.045, 1.02, 0.035]} /><meshStandardMaterial color="#3f3930" /></mesh>
    <mesh position={[0, 0, 0.17]}><boxGeometry args={[0.7, 0.045, 0.035]} /><meshStandardMaterial color="#3f3930" /></mesh>
    <mesh position={[0, -0.72, 0.09]} castShadow><boxGeometry args={[1.08, 0.12, 0.25]} /><meshStandardMaterial color="#d3c4a9" roughness={0.9} /></mesh>
    {balcony && <group position={[0, -0.77, 0.36]}><mesh><boxGeometry args={[1.45, 0.1, 0.62]} /><meshStandardMaterial color="#565147" metalness={0.35} /></mesh>{[-0.62, -0.31, 0, 0.31, 0.62].map((x) => <mesh key={x} position={[x, 0.34, 0.27]}><boxGeometry args={[0.035, 0.68, 0.035]} /><meshStandardMaterial color="#3e403c" metalness={0.55} /></mesh>)}</group>}
  </group>;
}

function StreetBuilding({ position, size, color = '#d8c7a1', roof = '#384b46', rotation = 0, shop = false, name = '' }) {
  const width = size[0]; const height = size[1]; const depth = size[2];
  const columns = Math.max(2, Math.floor(width / 2.2));
  const floors = Math.max(2, Math.floor((height - 1.7) / 1.75));
  const windowXs = Array.from({ length: columns }, (_, index) => -width / 2 + ((index + 0.5) * width) / columns);
  return <group position={position} rotation={[0, rotation, 0]}>
    <mesh position={[0, height / 2, 0]} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.96} /></mesh>
    <mesh position={[0, height + 0.36, 0]} castShadow><boxGeometry args={[width + 0.25, 0.72, depth + 0.2]} /><meshStandardMaterial color={roof} roughness={0.84} /></mesh>
    <mesh position={[0, height - 0.2, depth / 2 + 0.06]} castShadow><boxGeometry args={[width + 0.18, 0.18, 0.28]} /><meshStandardMaterial color="#e6dbc5" roughness={0.92} /></mesh>
    <mesh position={[0, 1.75, depth / 2 + 0.06]} castShadow><boxGeometry args={[width + 0.12, 0.16, 0.26]} /><meshStandardMaterial color="#c4af8d" roughness={0.92} /></mesh>
    {Array.from({ length: floors }, (_, floor) => windowXs.map((x, index) => <FacadeWindow key={`${floor}-${index}`} position={[x, 2.55 + floor * 1.68, depth / 2 + 0.08]} warm={(floor + index) % 4 === 0} balcony={floor === 0 && index === Math.floor(columns / 2)} />))}
    {shop ? <group position={[0, 0, depth / 2 + 0.11]}>
      <mesh position={[0, 0.82, 0]}><planeGeometry args={[width - 0.65, 1.45]} /><meshStandardMaterial color="#744631" roughness={0.75} /></mesh>
      <mesh position={[0, 1.62, 0.2]} rotation={[0.18, 0, 0]} castShadow><boxGeometry args={[width - 0.35, 0.14, 1.05]} /><meshStandardMaterial color="#b8893e" roughness={0.85} /></mesh>
      <mesh position={[0, 0.96, 0.035]}><planeGeometry args={[width - 1.05, 0.92]} /><meshStandardMaterial color="#8f603c" emissive="#ffb85b" emissiveIntensity={0.6} roughness={0.25} /></mesh>
      <mesh position={[0, 1.96, 0.02]}><planeGeometry args={[Math.min(width - 1, 4.8), 0.55]} /><meshStandardMaterial color="#2e4b42" roughness={0.85} /></mesh>
      {name && <Html center position={[0, 1.96, 0.08]} distanceFactor={10} style={{ pointerEvents: 'none' }}><div className="shop-sign">{name}</div></Html>}
    </group> : <mesh position={[0, 0.95, depth / 2 + 0.08]} castShadow><boxGeometry args={[1.05, 1.9, 0.16]} /><meshStandardMaterial color="#4b382b" roughness={0.9} /></mesh>}
    {[-width / 2 + 0.2, width / 2 - 0.2].map((x) => <mesh key={x} position={[x, height / 2, depth / 2 + 0.05]} castShadow><boxGeometry args={[0.24, height, 0.18]} /><meshStandardMaterial color="#eadfc9" roughness={0.95} /></mesh>)}
  </group>;
}

function ZoneLandmark({ zone, index }) {
  const [x, z] = zone.center;
  if (index === 0) return <group position={[x, 0, z]}><StreetBuilding position={[0, 0, 0]} size={[8.4, 6.8, 5.4]} color="#c99258" roof="#694436" shop name="财富工坊" /><mesh position={[0, 7.55, 0]} castShadow><torusGeometry args={[0.78, 0.09, 12, 30]} /><meshStandardMaterial color="#a97936" metalness={0.65} roughness={0.32} /></mesh></group>;
  if (index === 1) return <group position={[x, 0, z]}><StreetBuilding position={[0, 0, 0]} size={[8.2, 7.7, 5.5]} color="#b9c2bc" roof="#3d5361" shop name="判断书院" /><mesh position={[0, 9.1, 0]} castShadow><coneGeometry args={[1.25, 2.2, 10]} /><meshStandardMaterial color="#405865" metalness={0.18} roughness={0.72} /></mesh></group>;
  return <group position={[x, 0, z]}><mesh position={[0, 0.24, 0]} receiveShadow><cylinderGeometry args={[5.5, 5.8, 0.48, 48]} /><meshStandardMaterial color="#c5bda8" roughness={0.95} /></mesh><mesh position={[0, 0.5, 0]}><cylinderGeometry args={[4.25, 4.25, 0.18, 48]} /><meshStandardMaterial color="#668e89" metalness={0.05} roughness={0.22} /></mesh><mesh position={[0, 0.74, 0]}><cylinderGeometry args={[0.65, 0.85, 0.48, 20]} /><meshStandardMaterial color="#b9b09b" roughness={0.9} /></mesh><mesh position={[0, 1.6, 0]} castShadow><cylinderGeometry args={[0.12, 0.18, 1.7, 16]} /><meshStandardMaterial color="#a59b83" /></mesh><mesh position={[0, 2.42, 0]}><sphereGeometry args={[0.22, 18, 12]} /><meshStandardMaterial color="#d9c786" emissive="#e9c878" emissiveIntensity={0.4} /></mesh>{[-4.8, 4.8].map((px) => <Tree key={px} position={[px, 0, 1]} tint="#496e52" scale={0.78} />)}</group>;
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
    case 'pavilion': return <StreetBuilding position={[0, 0, 0]} size={[3.6, 3.8, 3.3]} color="#c8c2a2" roof="#4e6953" />;
    default: return <group><mesh position={[0, 0.8, 0]} castShadow><dodecahedronGeometry args={[0.9, 0]} />{common}</mesh><mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.8, 1, 0.4, 8]} />{common}</mesh></group>;
  }
}

function KnowledgeProp({ entity, zone, nearby, guided, onClick, hideLabel }) {
  const active = nearby || guided;
  return <group position={entity.position} onClick={(event) => { event.stopPropagation(); onClick(entity); }}>
    <Float speed={active ? 1.4 : 0.8} floatIntensity={active ? 0.05 : 0.015}>
      <group scale={active ? 1.08 : 1}><PropShape entity={entity} color={active ? zone.accent : zone.color} /></group>
      <mesh position={[0, 3.02, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[active ? 0.3 : 0.22, 0.035, 10, 30]} /><meshStandardMaterial color={zone.accent} emissive={zone.accent} emissiveIntensity={active ? 1.4 : 0.35} /></mesh>
    </Float>
    {active && <pointLight position={[0, 2.3, 0]} color={zone.accent} intensity={1.5} distance={7} />}
    {!hideLabel && (active || entity.type === 'character') && <Html center position={[0, 3.58, 0]} distanceFactor={12} style={{ pointerEvents: 'none' }}><div className={`world-label ${active ? 'active' : ''}`}>{entity.title}</div></Html>}
  </group>;
}

function createCobblestoneTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const context = canvas.getContext('2d');
  context.fillStyle = '#a99f8d'; context.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 12; row += 1) {
    const y = row * 44;
    const offset = row % 2 ? -24 : 0;
    for (let column = 0; column < 13; column += 1) {
      const x = column * 48 + offset;
      const shade = 142 + ((row * 17 + column * 29) % 32);
      context.fillStyle = `rgb(${shade + 14}, ${shade + 8}, ${shade - 2})`;
      context.strokeStyle = '#716c61'; context.lineWidth = 3;
      context.beginPath(); context.roundRect(x + 2, y + 3, 43, 36, 8); context.fill(); context.stroke();
      context.strokeStyle = '#d4cbbb55'; context.lineWidth = 1;
      context.beginPath(); context.moveTo(x + 8, y + 9); context.lineTo(x + 35, y + 8); context.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function StreetLamp({ position }) {
  return <group position={position}>
    <mesh position={[0, 1.65, 0]} castShadow><cylinderGeometry args={[0.055, 0.09, 3.3, 12]} /><meshStandardMaterial color="#303531" metalness={0.72} roughness={0.4} /></mesh>
    <mesh position={[0, 3.18, 0]} castShadow><cylinderGeometry args={[0.28, 0.16, 0.54, 8]} /><meshStandardMaterial color="#d7b76a" emissive="#ffbd61" emissiveIntensity={0.7} transparent opacity={0.88} /></mesh>
    <mesh position={[0, 3.48, 0]} castShadow><coneGeometry args={[0.38, 0.2, 8]} /><meshStandardMaterial color="#303531" metalness={0.7} /></mesh>
    <pointLight position={[0, 3.1, 0]} color="#ffd38a" intensity={0.65} distance={8} decay={2} />
  </group>;
}

function World({ pack, nearbyId, guidance, onPropClick, hideLabels }) {
  const cobblestone = useMemo(() => createCobblestoneTexture(), []);
  useEffect(() => () => cobblestone.dispose(), [cobblestone]);
  const trees = useMemo(() => [[-27, 0, 22, .78], [27, 0, 22, .82], [-28, 0, 10, .7], [28, 0, 10, .74], [-27, 0, -2, .9], [27, 0, -2, .9], [-29, 0, -27, .82], [29, 0, -27, .82]], []);
  const buildings = useMemo(() => [
    { position: [-20, 0, 28], size: [9, 7.6, 5], rotation: Math.PI, color: '#cab18c', roof: '#4c514d', shop: true, name: '长久书屋' },
    { position: [-9.5, 0, 28], size: [10, 8.5, 5], rotation: Math.PI, color: '#d1c3a7', roof: '#4e5961' },
    { position: [10, 0, 28], size: [10, 7.2, 5], rotation: Math.PI, color: '#c69b72', roof: '#664c42', shop: true, name: '复利商行' },
    { position: [21, 0, 28], size: [9, 8, 5], rotation: Math.PI, color: '#d0bea0', roof: '#47554f' },
    { position: [-20, 0, -34], size: [10, 8.2, 5], rotation: 0, color: '#b7c0b5', roof: '#455661', shop: true, name: '清醒阅览室' },
    { position: [-8.5, 0, -34], size: [11, 7.3, 5], rotation: 0, color: '#d0b88f', roof: '#675143' },
    { position: [8.5, 0, -34], size: [11, 8.5, 5], rotation: 0, color: '#b8b9a8', roof: '#48554d' },
    { position: [20.5, 0, -34], size: [10, 7.7, 5], rotation: 0, color: '#cda57d', roof: '#62483e', shop: true, name: '自由事务所' },
    { position: [-34, 0, 16], size: [10, 7.6, 5], rotation: Math.PI / 2, color: '#c9af89', roof: '#5e4e45' },
    { position: [-34, 0, 4], size: [11, 8.4, 5], rotation: Math.PI / 2, color: '#bdc3b8', roof: '#45555d', shop: true, name: '判断书店' },
    { position: [-34, 0, -18], size: [11, 7.4, 5], rotation: Math.PI / 2, color: '#c8ae8d', roof: '#554b43' },
    { position: [34, 0, 16], size: [10, 8, 5], rotation: -Math.PI / 2, color: '#c8b494', roof: '#4a5550', shop: true, name: '专长工房' },
    { position: [34, 0, 4], size: [11, 7.2, 5], rotation: -Math.PI / 2, color: '#d0ab7b', roof: '#69493d' },
    { position: [34, 0, -18], size: [11, 8.3, 5], rotation: -Math.PI / 2, color: '#b8c2ba', roof: '#43545c' },
  ], []);
  return <>
    <color attach="background" args={['#b9c9cc']} /><fog attach="fog" args={['#c9c2ae', 42, 92]} />
    <Sky distance={450000} sunPosition={[8, 3.2, -10]} inclination={0.49} azimuth={0.22} turbidity={5.5} rayleigh={1.7} mieCoefficient={0.007} mieDirectionalG={0.82} />
    <ambientLight intensity={0.42} /><hemisphereLight args={['#dce4dc', '#4d5148', 1.05]} />
    <directionalLight position={[-18, 24, 20]} color="#ffd6a0" intensity={3.4} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-far={80} shadow-camera-left={-42} shadow-camera-right={42} shadow-camera-top={42} shadow-camera-bottom={-42} shadow-bias={-0.00025} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[100, 100]} /><meshStandardMaterial color="#9f9b89" map={cobblestone} roughness={0.98} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]} receiveShadow><circleGeometry args={[9.5, 56]} /><meshStandardMaterial color="#c8baa0" map={cobblestone} roughness={0.95} /></mesh>
    <StreetBuilding position={[0, 0, 2]} size={[12, 8.8, 5]} color="#d8c9aa" roof="#3f514e" shop name="思想图书馆" />
    {buildings.map((building, index) => <StreetBuilding key={index} {...building} />)}
    {pack.zones.map((zone, index) => <group key={zone.id}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[zone.center[0], 0.045, zone.center[1]]}><circleGeometry args={[zone.radius * 0.72, 48]} /><meshStandardMaterial color={index === 2 ? '#899d7e' : '#b6aa92'} map={cobblestone} transparent opacity={0.72} roughness={0.98} /></mesh>
      <ZoneLandmark zone={zone} index={index} />
    </group>)}
    {pack.zones.map((zone) => <mesh key={`road-${zone.id}`} rotation={[-Math.PI / 2, 0, Math.atan2(zone.center[0], zone.center[1])]} position={[zone.center[0] / 2, 0.065, zone.center[1] / 2]} receiveShadow><planeGeometry args={[4.6, Math.hypot(...zone.center)]} /><meshStandardMaterial color="#c4b69d" map={cobblestone} roughness={1} /></mesh>)}
    {[[-6, 0, 13], [6, 0, 13], [-20, 0, 3], [20, 0, 3], [-23, 0, -22], [23, 0, -22]].map((position, index) => <StreetLamp key={index} position={position} />)}
    {trees.map(([x, y, z, scale], index) => <Tree key={index} position={[x, y, z]} tint={index % 2 ? '#4f7556' : '#678360'} scale={scale} />)}
    {pack.entities.map((entity) => <KnowledgeProp key={entity.id} entity={entity} zone={pack.zones.find((z) => z.id === entity.zoneId)} nearby={nearbyId === entity.id} guided={guidance?.id === entity.id} onClick={onPropClick} hideLabel={hideLabels} />)}
    <ContactShadows position={[0, 0.08, 0]} opacity={0.34} scale={72} blur={2.1} far={20} resolution={1024} color="#3f443f" />
  </>;
}

export function WorldCanvas({ pack, paused, nearby, guidance, onZone, onDiscover, onNear, onInteract, onPropClick, onPlayerUpdate, resetSignal }) {
  return <Canvas className="world-canvas" shadows dpr={[1, 1.5]} camera={{ position: [0, 4, 24], fov: 44, near: 0.1, far: 150 }} gl={{ antialias: true, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.domElement.dataset.testid = 'world-canvas'; gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.14; }}>
    <Suspense fallback={null}>
      <World pack={pack} nearbyId={nearby?.id} guidance={guidance} onPropClick={onPropClick} hideLabels={paused} />
      <Player key={pack.id} pack={pack} paused={paused} onZone={onZone} onDiscover={onDiscover} onNear={onNear} onInteract={onInteract} onUpdate={onPlayerUpdate} resetSignal={resetSignal} />
    </Suspense>
  </Canvas>;
}
