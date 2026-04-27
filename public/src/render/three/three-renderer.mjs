import * as THREE from '../../../vendor/three.module.js';
import { buildDungeonRenderData, gridToWorldPosition } from './dungeon-mesh-builder.mjs';

const ENEMY_COLORS = {
  goblin: 0x4ade80,
  skeleton: 0xf3f4f6,
  orc: 0x166534,
  spider: 0x6b7280,
  bat: 0x312e81,
};

function createActorMesh({ color }) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.55, 4, 8), material);
  body.position.y = 0.55;
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

function applyWorldPosition(mesh, tilePosition, bounds) {
  const world = gridToWorldPosition(tilePosition.x, tilePosition.y, bounds);
  mesh.position.set(world.x, mesh.position.y, world.z);
}

export class ThreeRenderer {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b1020);
    this.scene.fog = new THREE.Fog(0x0b1020, 10, 28);

    this.camera = new THREE.PerspectiveCamera(65, 1, 0.1, 100);
    this.camera.position.set(0, 9, 8);

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

    this.addLights();
    this.handleResize();
    window.addEventListener('resize', this.handleResizeBound = () => this.handleResize());
  }

  addLights() {
    const ambient = new THREE.AmbientLight(0x8aa0ff, 0.7);
    this.scene.add(ambient);

    const moon = new THREE.DirectionalLight(0xcdd6ff, 1.3);
    moon.position.set(6, 12, 4);
    moon.castShadow = true;
    moon.shadow.mapSize.width = 2048;
    moon.shadow.mapSize.height = 2048;
    this.scene.add(moon);

    const rim = new THREE.PointLight(0x4ecca3, 0.8, 20);
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

    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x243b53, roughness: 0.95 });
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
    const floorGeometry = new THREE.BoxGeometry(1, 0.08, 1);
    const wallGeometry = new THREE.BoxGeometry(1, 1.6, 1);

    renderData.floors.forEach((tile) => {
      const world = gridToWorldPosition(tile.x, tile.z, renderData.bounds);
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.position.set(world.x, -0.04, world.z);
      floor.receiveShadow = true;
      this.worldRoot.add(floor);
    });

    renderData.walls.forEach((tile) => {
      const world = gridToWorldPosition(tile.x, tile.z, renderData.bounds);
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.position.set(world.x, 0.8, world.z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.worldRoot.add(wall);
    });

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

    this.playerMesh.position.set(this.playerVisual.x, 0, this.playerVisual.z);
    this.playerMesh.rotation.y = this.playerVisual.yaw;

    this.rimLight.position.set(this.playerVisual.x, 2.4, this.playerVisual.z);
  }

  syncEnemies(state, deltaSeconds) {
    const liveIds = new Set();

    state.enemies.forEach((enemy) => {
      liveIds.add(enemy.id);
      let enemyEntry = this.enemyMeshes.get(enemy.id);
      if (!enemyEntry) {
        const mesh = createActorMesh({ color: ENEMY_COLORS[enemy.type] || 0x94a3b8 });
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
      enemyEntry.mesh.position.set(enemyEntry.x, 0, enemyEntry.z);

      if (enemy.alive && state.player) {
        const lookX = this.playerVisual.x - enemyEntry.x;
        const lookZ = this.playerVisual.z - enemyEntry.z;
        enemyEntry.yaw = Math.atan2(lookX, lookZ);
        enemyEntry.mesh.rotation.y = enemyEntry.yaw;
      }
    });

    this.enemyMeshes.forEach((entry, id) => {
      if (!liveIds.has(id)) {
        this.scene.remove(entry.mesh);
        this.enemyMeshes.delete(id);
      }
    });
  }

  updateCamera(deltaSeconds) {
    const target = new THREE.Vector3(this.playerVisual.x, 0.7, this.playerVisual.z);
    const offset = new THREE.Vector3(-4.6, 7.2, 5.5);
    const desired = target.clone().add(offset);
    const cameraDamping = Math.min(1, deltaSeconds * 5);

    this.camera.position.lerp(desired, cameraDamping);
    this.cameraTarget.lerp(target, cameraDamping);
    this.camera.lookAt(this.cameraTarget);
  }

  render(state, deltaSeconds) {
    this.rebuildDungeon(state.dungeon);
    this.syncPlayer(state, deltaSeconds);
    this.syncEnemies(state, deltaSeconds);

    if (state.player) {
      this.updateCamera(deltaSeconds);
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener('resize', this.handleResizeBound);
    this.renderer.dispose();
  }
}
