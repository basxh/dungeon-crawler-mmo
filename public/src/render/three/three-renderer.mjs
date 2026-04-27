import * as THREE from '../../../vendor/three.module.js';
import { DEFAULT_CAMERA_CONFIG } from './camera-config.mjs';
import { buildDungeonRenderData, gridToWorldPosition } from './dungeon-mesh-builder.mjs';

const ENEMY_COLORS = {
  goblin: 0x4ade80,
  skeleton: 0xf3f4f6,
  orc: 0x166534,
  spider: 0x6b7280,
  bat: 0x312e81,
};

const BASE_STATUS = '3D-Dungeon bereit. WASD zum Bewegen, Leertaste zum Angreifen.';

function createActorMesh({ color }) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1, emissive: 0x000000 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.8, 4, 8), material);
  body.position.y = 0.68;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.33, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.2, transparent: true })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  group.add(shadow);

  group.userData = {
    body,
    material,
    hitFlash: 0,
    pulse: 0,
    baseScale: 1,
  };

  return group;
}

function createMarker(color, radius = 0.28) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.08, 24),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 })
  );
  mesh.position.y = 0.05;
  mesh.receiveShadow = true;
  return mesh;
}

function createTorch(color, x, y, z) {
  const torch = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.9, 12),
    new THREE.MeshStandardMaterial({ color: 0x6b4f2f, roughness: 0.9 })
  );
  pole.position.y = 0.45;
  torch.add(pole);

  const flame = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 10, 10),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4 })
  );
  flame.position.y = 0.98;
  torch.add(flame);

  const light = new THREE.PointLight(color, 1.5, 6, 2);
  light.position.y = 1.05;
  torch.add(light);

  torch.position.set(x, y, z);
  return torch;
}

function triggerHitFlash(meshGroup, pulse = 0.22) {
  if (!meshGroup?.userData) {
    return;
  }
  meshGroup.userData.hitFlash = 0.22;
  meshGroup.userData.pulse = Math.max(meshGroup.userData.pulse || 0, pulse);
}

export class ThreeRenderer {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x132238);
    this.scene.fog = new THREE.Fog(0x132238, 14, 32);

    this.camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
    this.camera.position.set(
      DEFAULT_CAMERA_CONFIG.offset.x,
      DEFAULT_CAMERA_CONFIG.offset.y,
      DEFAULT_CAMERA_CONFIG.offset.z
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    this.worldRoot = new THREE.Group();
    this.scene.add(this.worldRoot);

    this.playerMesh = createActorMesh({ color: 0x3b82f6 });
    this.playerMesh.visible = false;
    this.scene.add(this.playerMesh);

    this.enemyMeshes = new Map();
    this.currentDungeon = null;
    this.currentBounds = { width: 0, depth: 0 };
    this.playerVisual = { x: 0, z: 0, yaw: 0 };
    this.cameraTarget = new THREE.Vector3();
    this.combatTextSprites = [];
    this.previousPlayerHp = null;
    this.previousEnemies = [];
    this.playerAttackPulse = 0;
    this.cameraShake = 0;

    this.addLights();
    this.handleResize();
    window.addEventListener('resize', this.handleResizeBound = () => this.handleResize());
  }

  addLights() {
    const ambient = new THREE.AmbientLight(0xb9c8ff, 0.9);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.9);
    sun.position.set(4, 8, 3);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    this.scene.add(sun);

    const fill = new THREE.HemisphereLight(0x87a8ff, 0x24324a, 0.85);
    this.scene.add(fill);

    const rim = new THREE.PointLight(0x4ecca3, 1.2, 14);
    rim.position.set(0, 2.5, 0);
    this.scene.add(rim);
    this.rimLight = rim;
  }

  handleResize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  rebuildDungeon(dungeon) {
    if (!dungeon) {
      return;
    }

    if (this.currentDungeon === dungeon) {
      return;
    }

    this.currentDungeon = dungeon;
    this.worldRoot.clear();

    const renderData = buildDungeonRenderData(dungeon);
    this.currentBounds = renderData.bounds;

    const floorGeometry = new THREE.BoxGeometry(1, 0.08, 1);
    const wallGeometry = new THREE.BoxGeometry(1, 2.1, 1);

    renderData.floors.forEach((tile) => {
      const world = gridToWorldPosition(tile.x, tile.z, renderData.bounds);
      const floorColor = (tile.x + tile.z) % 2 === 0 ? 0x4f6d8d : 0x3f5b78;
      const floor = new THREE.Mesh(
        floorGeometry,
        new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.86, metalness: 0.04 })
      );
      floor.position.set(world.x, -0.04, world.z);
      floor.receiveShadow = true;
      this.worldRoot.add(floor);
    });

    renderData.walls.forEach((tile, index) => {
      const world = gridToWorldPosition(tile.x, tile.z, renderData.bounds);
      const wallColor = index % 4 === 0 ? 0x9db4c9 : 0x7f95ad;
      const wall = new THREE.Mesh(
        wallGeometry,
        new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.72, metalness: 0.08 })
      );
      wall.position.set(world.x, 1.05, world.z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.worldRoot.add(wall);

      if (index % 7 === 0) {
        this.worldRoot.add(createTorch(0xf97316, world.x, 0, world.z));
      }
    });

    const floorPlate = new THREE.Mesh(
      new THREE.BoxGeometry(renderData.bounds.width + 2, 0.5, renderData.bounds.depth + 2),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 1 })
    );
    floorPlate.position.set(0, -0.35, 0);
    floorPlate.receiveShadow = true;
    this.worldRoot.add(floorPlate);

    if (renderData.start) {
      const startMarker = createMarker(0xe94560);
      const startWorld = gridToWorldPosition(renderData.start.x, renderData.start.z, renderData.bounds);
      startMarker.position.set(startWorld.x, 0.05, startWorld.z);
      this.worldRoot.add(startMarker);
    }

    if (renderData.exit) {
      const exitMarker = createMarker(0x4ecca3, 0.34);
      const exitWorld = gridToWorldPosition(renderData.exit.x, renderData.exit.z, renderData.bounds);
      exitMarker.position.set(exitWorld.x, 0.05, exitWorld.z);
      this.worldRoot.add(exitMarker);
    }
  }

  spawnFloatingText({ text, color, worldX, worldZ }) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = 'bold 44px Inter, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = color;
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(worldX, 1.7, worldZ);
    sprite.scale.set(1.8, 0.68, 1);
    this.scene.add(sprite);

    this.combatTextSprites.push({ sprite, ttl: 0.9 });
  }

  processCombatEvents(state) {
    state.combatEvents?.forEach((event) => {
      const world = gridToWorldPosition(event.x, event.y, this.currentBounds);
      if (event.type === 'hit') {
        const enemyEntry = this.enemyMeshes.get(event.id);
        if (enemyEntry) {
          triggerHitFlash(enemyEntry.mesh, 0.26);
        }
        this.spawnFloatingText({ text: `-${event.damage}`, color: '#fca5a5', worldX: world.x, worldZ: world.z });
      }

      if (event.type === 'death') {
        this.spawnFloatingText({ text: 'KO', color: '#fbbf24', worldX: world.x, worldZ: world.z });
      }
    });

    if (state.playerTookDamage) {
      triggerHitFlash(this.playerMesh, 0.32);
      this.cameraShake = Math.max(this.cameraShake, 0.22);
    }

    if (state.playerDidAttack) {
      this.playerAttackPulse = 0.18;
      triggerHitFlash(this.playerMesh, 0.18);
    }
  }

  updateActorEffects(meshGroup, deltaSeconds) {
    if (!meshGroup?.userData) {
      return;
    }

    const data = meshGroup.userData;
    data.hitFlash = Math.max(0, data.hitFlash - deltaSeconds);
    data.pulse = Math.max(0, data.pulse - deltaSeconds);

    const flashStrength = data.hitFlash > 0 ? data.hitFlash / 0.22 : 0;
    data.material.emissive.setRGB(flashStrength, flashStrength * 0.28, flashStrength * 0.28);

    const pulseStrength = data.pulse > 0 ? Math.sin((data.pulse / 0.3) * Math.PI) * 0.12 : 0;
    const scale = data.baseScale + pulseStrength;
    meshGroup.scale.setScalar(scale);
  }

  syncPlayer(state, deltaSeconds) {
    if (!state.player || !state.dungeon) {
      this.playerMesh.visible = false;
      return;
    }

    this.playerMesh.visible = true;
    const target = gridToWorldPosition(state.player.x, state.player.y, this.currentBounds);
    const damping = Math.min(1, deltaSeconds * 10);

    this.playerVisual.x += (target.x - this.playerVisual.x) * damping;
    this.playerVisual.z += (target.z - this.playerVisual.z) * damping;

    const direction = state.player.direction || { x: 0, y: 1 };
    if (direction.x !== 0 || direction.y !== 0) {
      this.playerVisual.yaw = Math.atan2(direction.x, direction.y);
    }

    const bob = state.connected ? Math.sin(performance.now() * 0.006) * 0.05 : 0;
    this.playerMesh.position.set(this.playerVisual.x, bob, this.playerVisual.z);
    this.playerMesh.rotation.y = this.playerVisual.yaw;
    this.rimLight.position.set(this.playerVisual.x, 2.4, this.playerVisual.z);

    this.updateActorEffects(this.playerMesh, deltaSeconds);
  }

  syncEnemies(state, deltaSeconds) {
    const liveIds = new Set();

    state.enemies.forEach((enemy) => {
      liveIds.add(enemy.id);
      let enemyEntry = this.enemyMeshes.get(enemy.id);
      if (!enemyEntry) {
        const mesh = createActorMesh({ color: ENEMY_COLORS[enemy.type] || 0x94a3b8 });
        mesh.userData.baseScale = 0.9;
        mesh.scale.setScalar(0.9);
        this.scene.add(mesh);
        enemyEntry = { mesh, x: 0, z: 0, yaw: 0 };
        this.enemyMeshes.set(enemy.id, enemyEntry);
      }

      enemyEntry.mesh.visible = enemy.alive;
      const target = gridToWorldPosition(enemy.x, enemy.y, this.currentBounds);
      const damping = Math.min(1, deltaSeconds * 8);
      enemyEntry.x += (target.x - enemyEntry.x) * damping;
      enemyEntry.z += (target.z - enemyEntry.z) * damping;
      const bob = enemy.alive ? Math.sin(performance.now() * 0.004 + enemy.x) * 0.04 : 0;
      enemyEntry.mesh.position.set(enemyEntry.x, bob, enemyEntry.z);

      if (enemy.alive && state.player) {
        const lookX = this.playerVisual.x - enemyEntry.x;
        const lookZ = this.playerVisual.z - enemyEntry.z;
        enemyEntry.yaw = Math.atan2(lookX, lookZ);
        enemyEntry.mesh.rotation.y = enemyEntry.yaw;
      }

      this.updateActorEffects(enemyEntry.mesh, deltaSeconds);
    });

    this.enemyMeshes.forEach((entry, id) => {
      if (!liveIds.has(id)) {
        this.scene.remove(entry.mesh);
        this.enemyMeshes.delete(id);
      }
    });
  }

  updateFloatingTexts(deltaSeconds) {
    this.combatTextSprites = this.combatTextSprites.filter((entry) => {
      entry.ttl -= deltaSeconds;
      entry.sprite.position.y += deltaSeconds * 1.2;
      entry.sprite.material.opacity = Math.max(0, entry.ttl / 0.9);
      if (entry.ttl <= 0) {
        this.scene.remove(entry.sprite);
        entry.sprite.material.map.dispose();
        entry.sprite.material.dispose();
        return false;
      }
      return true;
    });
  }

  updateCamera(deltaSeconds, state) {
    const direction = state.player?.direction || { x: 0, y: 1 };
    const directionLength = Math.hypot(direction.x, direction.y) || 1;
    const lookAhead = new THREE.Vector3(
      (direction.x / directionLength) * DEFAULT_CAMERA_CONFIG.lookAheadDistance,
      0,
      (direction.y / directionLength) * DEFAULT_CAMERA_CONFIG.lookAheadDistance
    );
    const target = new THREE.Vector3(
      this.playerVisual.x,
      DEFAULT_CAMERA_CONFIG.lookTargetHeight,
      this.playerVisual.z
    ).add(lookAhead);
    const offset = new THREE.Vector3(
      DEFAULT_CAMERA_CONFIG.offset.x,
      DEFAULT_CAMERA_CONFIG.offset.y,
      DEFAULT_CAMERA_CONFIG.offset.z
    );
    const desired = target.clone().add(offset);
    const cameraDamping = Math.min(1, deltaSeconds * DEFAULT_CAMERA_CONFIG.damping);

    this.camera.position.lerp(desired, cameraDamping);
    this.cameraTarget.lerp(target, cameraDamping);

    if (this.playerAttackPulse > 0) {
      this.playerAttackPulse = Math.max(0, this.playerAttackPulse - deltaSeconds);
    }

    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - deltaSeconds * 0.9);
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake * 0.18;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake * 0.16;
    }

    this.camera.lookAt(this.cameraTarget);
  }

  render(state, deltaSeconds) {
    this.rebuildDungeon(state.dungeon);
    this.processCombatEvents(state);
    this.syncPlayer(state, deltaSeconds);
    this.syncEnemies(state, deltaSeconds);
    this.updateFloatingTexts(deltaSeconds);

    if (state.player) {
      this.updateCamera(deltaSeconds, state);
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener('resize', this.handleResizeBound);
    this.renderer.dispose();
  }
}

export { BASE_STATUS };
