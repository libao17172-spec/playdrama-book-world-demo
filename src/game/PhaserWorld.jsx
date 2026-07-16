import { useEffect, useRef } from 'react';
import { clampToWorld, getFacing, getNearestNode, isNodeInteractable } from './world-model.js';

function createScene(Phaser, pack, callbacksRef, controlRef) {
  const base = import.meta.env.BASE_URL;
  return class BookWorldScene extends Phaser.Scene {
    constructor() { super('book-world'); }

    preload() {
      this.load.image('world-map', `${base}${pack.world2d.background}`);
      this.load.spritesheet('player-away', `${base}assets/characters/victorian-player-walkcycle-v1.png`, { frameWidth: 512, frameHeight: 1024 });
      this.load.spritesheet('player-toward', `${base}assets/characters/victorian-player-walkcycle-front-v1.png`, { frameWidth: 443, frameHeight: 887 });
      this.load.spritesheet('player-side', `${base}assets/characters/victorian-player-walkcycle-side-v1.png`, { frameWidth: 443, frameHeight: 887 });
    }

    create() {
      const world = pack.world2d;
      const walkable = world.walkable ?? { left: 0, top: 0, right: world.width, bottom: world.height };
      this.physics.world.setBounds(walkable.left, walkable.top, walkable.right - walkable.left, walkable.bottom - walkable.top);
      this.cameras.main.setBounds(0, 0, world.width, world.height);
      this.add.image(0, 0, 'world-map').setOrigin(0).setDisplaySize(world.width, world.height).setDepth(0);
      this.add.rectangle(world.width / 2, world.height / 2, world.width - 18, world.height - 18)
        .setStrokeStyle(18, 0x203c34, 0.48).setDepth(2);

      for (const facing of ['away', 'toward', 'side']) {
        const texture = facing === 'side' ? 'player-side' : `player-${facing}`;
        this.anims.create({ key: `walk-${facing}`, frames: this.anims.generateFrameNumbers(texture, { start: 0, end: 3 }), frameRate: 7, repeat: -1 });
      }

      this.player = this.physics.add.sprite(world.spawn.x, world.spawn.y, 'player-away', 0)
        .setScale(0.18).setDepth(world.spawn.y + 500).setCollideWorldBounds(true);
      this.player.body.setSize(180, 250).setOffset(166, 720);
      this.facing = 'away';
      this.target = null;
      this.lastSenseAt = 0;
      this.nearby = null;
      this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
      this.cameras.main.setDeadzone(120, 80);
      this.cameras.main.fadeIn(420, 20, 37, 32);
      callbacksRef.current.onPlayerUpdate({ position: [world.spawn.x, 0, world.spawn.y], yaw: 0, facing: this.facing, moving: false });

      this.keys = this.input.keyboard.addKeys({
        up: 'W', down: 'S', left: 'A', right: 'D',
        arrowUp: 'UP', arrowDown: 'DOWN', arrowLeft: 'LEFT', arrowRight: 'RIGHT',
        interact: 'E', reset: 'R',
      });
      this.input.keyboard.on('keydown-E', () => this.interact());
      this.input.keyboard.on('keydown-R', () => this.resetPlayer());

      this.nodeViews = new Map();
      for (const entity of pack.entities.filter((item) => item.world2d)) this.createNode(entity);

      this.input.on('pointerdown', (pointer, objects) => {
        if (objects.length || callbacksRef.current.isPaused()) return;
        this.target = clampToWorld({ x: pointer.worldX, y: pointer.worldY }, world);
        callbacksRef.current.onGuidance(null);
      });
      callbacksRef.current.onReady?.();
    }

    createNode(entity) {
      const { x, y } = entity.world2d;
      const featured = Boolean(entity.world2d.featured);
      const ring = this.add.circle(0, 0, featured ? 23 : 13, 0xd7b45d, featured ? 0.2 : 0.08).setStrokeStyle(featured ? 3 : 1, 0xf2d88a, featured ? 0.95 : 0.3);
      const core = this.add.circle(0, 0, featured ? 7 : 4, 0xf4d174, featured ? 1 : 0.3);
      const label = this.add.text(0, -43, entity.title, {
        fontFamily: '"Songti SC", Georgia, serif', fontSize: '21px', color: '#fff5d8',
        backgroundColor: '#173730e6', padding: { x: 12, y: 7 }, stroke: '#10251f', strokeThickness: 2,
      }).setOrigin(0.5).setAlpha(entity.world2d.featured ? 1 : 0);
      const container = this.add.container(x, y, [ring, core, label]).setDepth(y + 350).setSize(130, 100).setInteractive({ useHandCursor: true });
      container.on('pointerdown', (_pointer, _x, _y, event) => {
        event.stopPropagation();
        if (!callbacksRef.current.isUnlocked(entity)) {
          callbacksRef.current.onNotice('完成第一章路线后解锁这个知识点');
          return;
        }
        if (isNodeInteractable({ x: this.player.x, y: this.player.y }, entity)) this.openEntity(entity);
        else {
          this.target = { x, y: Math.min(pack.world2d.height - 80, y + 95) };
          callbacksRef.current.onGuidance(entity);
          callbacksRef.current.onNotice(`沿着道路走近「${entity.title}」后才能互动`);
        }
      });
      this.tweens.add({ targets: ring, scale: 1.32, alpha: 0.05, duration: 1250, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: (x + y) % 400 });
      this.nodeViews.set(entity.id, { container, ring, core, label });
    }

    resetPlayer() {
      const { spawn } = pack.world2d;
      this.player.setPosition(spawn.x, spawn.y).setVelocity(0, 0);
      this.target = null;
      callbacksRef.current.onNotice('已回到中央安全道路');
    }

    interact() {
      if (this.nearby) this.openEntity(this.nearby);
      else callbacksRef.current.onNotice('继续靠近发光的知识节点');
    }

    openEntity(entity) {
      this.target = null;
      this.player.setVelocity(0, 0);
      callbacksRef.current.onInteract(entity);
    }

    update(time) {
      if (!this.player) return;
      const paused = callbacksRef.current.isPaused();
      const touch = controlRef.current;
      let x = 0;
      let y = 0;
      if (!paused) {
        const held = touch.keys;
        x = (this.keys.right.isDown || this.keys.arrowRight.isDown || held.has('d') || held.has('arrowright') ? 1 : 0) - (this.keys.left.isDown || this.keys.arrowLeft.isDown || held.has('a') || held.has('arrowleft') ? 1 : 0) + touch.x;
        y = (this.keys.down.isDown || this.keys.arrowDown.isDown || held.has('s') || held.has('arrowdown') ? 1 : 0) - (this.keys.up.isDown || this.keys.arrowUp.isDown || held.has('w') || held.has('arrowup') ? 1 : 0) + touch.y;
      }

      if (!x && !y && this.target && !paused) {
        const dx = this.target.x - this.player.x;
        const dy = this.target.y - this.player.y;
        if (Math.hypot(dx, dy) < 18) this.target = null;
        else { x = dx; y = dy; }
      } else if (x || y) this.target = null;

      const moving = Boolean(x || y) && !paused;
      if (moving) {
        const length = Math.hypot(x, y) || 1;
        x /= length; y /= length;
        this.player.setVelocity(x * 360, y * 360);
        const nextFacing = getFacing(x, y, this.facing);
        if (nextFacing !== this.facing || !this.player.anims.isPlaying) {
          this.facing = nextFacing;
          const animationFacing = ['left', 'right'].includes(nextFacing) ? 'side' : nextFacing;
          this.player.setTexture(animationFacing === 'side' ? 'player-side' : `player-${animationFacing}`);
          this.player.setFlipX(nextFacing === 'left');
          this.player.play(`walk-${animationFacing}`, true);
        }
      } else {
        this.player.setVelocity(0, 0);
        this.player.anims.stop();
        this.player.setFrame(0);
      }
      const bounded = clampToWorld({ x: this.player.x, y: this.player.y }, pack.world2d);
      if (bounded.x !== this.player.x || bounded.y !== this.player.y) this.player.setPosition(bounded.x, bounded.y);
      this.player.setDepth(this.player.y + 500);

      if (time - this.lastSenseAt > 100) {
        this.lastSenseAt = time;
        const position = { x: this.player.x, y: this.player.y };
        const unlockedEntities = pack.entities.filter((entity) => callbacksRef.current.isUnlocked(entity));
        const nearest = getNearestNode(position, unlockedEntities);
        if (nearest?.id !== this.nearby?.id) {
          this.nearby = nearest;
          callbacksRef.current.onNear(nearest);
        }
        for (const entity of pack.entities) {
          if (!entity.world2d) continue;
          const distance = Phaser.Math.Distance.Between(position.x, position.y, entity.world2d.x, entity.world2d.y);
          if (callbacksRef.current.isUnlocked(entity) && distance < 220) callbacksRef.current.onDiscover(entity);
          const view = this.nodeViews.get(entity.id);
          if (view) view.label.setAlpha(entity.world2d.featured ? (distance < 620 ? 1 : 0.58) : 0);
        }
        const zoneEntity = pack.entities
          .filter((entity) => entity.world2d)
          .sort((a, b) => Phaser.Math.Distance.Between(position.x, position.y, a.world2d.x, a.world2d.y) - Phaser.Math.Distance.Between(position.x, position.y, b.world2d.x, b.world2d.y))[0];
        const zone = zoneEntity && Phaser.Math.Distance.Between(position.x, position.y, zoneEntity.world2d.x, zoneEntity.world2d.y) < 520
          ? pack.zones.find((item) => item.id === zoneEntity.zoneId) : null;
        callbacksRef.current.onZone(zone);
        callbacksRef.current.onPlayerUpdate({ position: [this.player.x, 0, this.player.y], yaw: 0, facing: this.facing, moving });
      }
    }
  };
}

export function PhaserWorld({ pack, paused, unlockAll, onPlayerUpdate, onZone, onDiscover, onNear, onInteract, onGuidance, onNotice, resetSignal }) {
  const hostRef = useRef(null);
  const gameRef = useRef(null);
  const sceneRef = useRef(null);
  const pausedRef = useRef(paused);
  const callbacksRef = useRef({});
  const controlRef = useRef({ x: 0, y: 0, keys: new Set() });
  pausedRef.current = paused;
  callbacksRef.current = {
    isPaused: () => pausedRef.current,
    isUnlocked: (entity) => Boolean(entity.world2d?.featured || unlockAll),
    onPlayerUpdate, onZone, onDiscover, onNear, onInteract, onGuidance, onNotice,
    onReady: () => { sceneRef.current = gameRef.current?.scene.getScene('book-world'); },
  };

  useEffect(() => {
    let disposed = false;
    import('phaser').then(({ default: Phaser }) => {
      if (disposed || !hostRef.current) return;
      const Scene = createScene(Phaser, pack, callbacksRef, controlRef);
      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        width: hostRef.current.clientWidth || 1280,
        height: hostRef.current.clientHeight || 720,
        backgroundColor: '#17332d',
        transparent: false,
        physics: { default: 'arcade', arcade: { debug: false } },
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        render: { antialias: true, pixelArt: false, roundPixels: true },
        scene: Scene,
      });
      gameRef.current = game;
      requestAnimationFrame(() => hostRef.current?.querySelector('canvas')?.setAttribute('data-testid', 'phaser-canvas'));
    });
    return () => { disposed = true; gameRef.current?.destroy(true); gameRef.current = null; };
  }, [pack.id]);

  useEffect(() => { if (resetSignal && sceneRef.current) sceneRef.current.resetPlayer(); }, [resetSignal]);

  useEffect(() => {
    const movementKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
    const down = (event) => {
      if (['INPUT', 'TEXTAREA'].includes(event.target?.tagName)) return;
      const key = event.key.toLowerCase();
      if (movementKeys.has(key)) controlRef.current.keys.add(key);
    };
    const up = (event) => controlRef.current.keys.delete(event.key.toLowerCase());
    const clear = () => controlRef.current.keys.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); };
  }, []);

  const setDirection = (x, y) => () => { controlRef.current.x = x; controlRef.current.y = y; };
  const stopDirection = () => { controlRef.current.x = 0; controlRef.current.y = 0; };
  return <div className="phaser-world-shell">
    <div ref={hostRef} className="phaser-world" data-testid="phaser-world" />
    <div className="touch-controls" aria-label="触屏移动控制">
      <button className="touch-up" aria-label="向前走" onPointerDown={setDirection(0, -1)} onPointerUp={stopDirection} onPointerCancel={stopDirection}>▲</button>
      <button className="touch-left" aria-label="向左走" onPointerDown={setDirection(-1, 0)} onPointerUp={stopDirection} onPointerCancel={stopDirection}>◀</button>
      <button className="touch-down" aria-label="向后走" onPointerDown={setDirection(0, 1)} onPointerUp={stopDirection} onPointerCancel={stopDirection}>▼</button>
      <button className="touch-right" aria-label="向右走" onPointerDown={setDirection(1, 0)} onPointerUp={stopDirection} onPointerCancel={stopDirection}>▶</button>
    </div>
    <button className="touch-interact" onClick={() => sceneRef.current?.interact()}>互动</button>
  </div>;
}
