const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { prepareStaticAssets } = require('./runtime-assets');

class Dungeon {
  constructor(level, width = 50, height = 50) {
    this.level = level;
    this.width = width;
    this.height = height;
    this.map = [];
    this.startPos = { x: 0, y: 0 };
    this.endPos = { x: 0, y: 0 };
    this.enemies = [];
    this.players = new Set();
    this.generate();
  }

  generate() {
    for (let y = 0; y < this.height; y++) {
      this.map[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.map[y][x] = Math.random() < 0.45 ? 1 : 0;
      }
    }

    for (let i = 0; i < 5; i++) {
      this.smoothMap();
    }

    this.floodFillCaves();
    this.placeStartEnd();
    this.spawnEnemies();
  }

  smoothMap() {
    const newMap = JSON.parse(JSON.stringify(this.map));
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        let walls = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (this.map[y + dy][x + dx] === 1) walls++;
          }
        }
        if (walls > 4) newMap[y][x] = 1;
        else if (walls < 4) newMap[y][x] = 0;
      }
    }
    this.map = newMap;
  }

  floodFillCaves() {
    let largestCave = [];
    const visited = new Set();

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.map[y][x] === 0 && !visited.has(`${x},${y}`)) {
          const cave = [];
          const queue = [{ x, y }];
          visited.add(`${x},${y}`);

          while (queue.length > 0) {
            const pos = queue.shift();
            cave.push(pos);

            [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
              const nx = pos.x + dx;
              const ny = pos.y + dy;
              if (
                nx >= 0 &&
                nx < this.width &&
                ny >= 0 &&
                ny < this.height &&
                this.map[ny][nx] === 0 &&
                !visited.has(`${nx},${ny}`)
              ) {
                visited.add(`${nx},${ny}`);
                queue.push({ x: nx, y: ny });
              }
            });
          }

          if (cave.length > largestCave.length) {
            largestCave = cave;
          }
        }
      }
    }

    this.map = this.map.map((row) => row.map(() => 1));
    largestCave.forEach((pos) => {
      this.map[pos.y][pos.x] = 0;
    });
  }

  placeStartEnd() {
    const openSpaces = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.map[y][x] === 0) openSpaces.push({ x, y });
      }
    }

    this.startPos =
      openSpaces.find((p) => p.x < this.width * 0.3 && p.y < this.height * 0.3) || openSpaces[0];
    this.endPos =
      [...openSpaces].reverse().find((p) => p.x > this.width * 0.7 && p.y > this.height * 0.7) ||
      openSpaces[openSpaces.length - 1];

    this.map[this.startPos.y][this.startPos.x] = 2;
    this.map[this.endPos.y][this.endPos.x] = 3;
  }

  spawnEnemies() {
    const enemyCount = 5 + this.level * 2;
    const openSpaces = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.map[y][x] === 0) {
          const distFromStart = Math.abs(x - this.startPos.x) + Math.abs(y - this.startPos.y);
          if (distFromStart > 5) openSpaces.push({ x, y });
        }
      }
    }

    for (let i = 0; i < enemyCount && openSpaces.length > 0; i++) {
      const idx = Math.floor(Math.random() * openSpaces.length);
      const pos = openSpaces.splice(idx, 1)[0];
      const types = ['goblin', 'skeleton', 'orc', 'spider', 'bat'];
      const type = types[Math.floor(Math.random() * types.length)];

      this.enemies.push({
        id: `enemy_${this.level}_${i}`,
        type,
        x: pos.x,
        y: pos.y,
        hp: 20 + this.level * 10,
        maxHp: 20 + this.level * 10,
        damage: 5 + this.level * 2,
        alive: true,
      });
    }
  }
}

const WEAPONS = {
  sword_1h: { name: 'Einhand-Schwert', damage: 12, range: 1, speed: 1.0, type: 'melee' },
  sword_2h: { name: 'Zweihand-Schwert', damage: 20, range: 1.5, speed: 0.7, type: 'melee' },
  axe: { name: 'Axt', damage: 25, range: 1, speed: 0.6, type: 'melee' },
  mace: { name: 'Streitkolben', damage: 18, range: 1, speed: 0.8, type: 'melee' },
  bow: { name: 'Bogen', damage: 10, range: 8, speed: 1.2, type: 'ranged' },
  crossbow: { name: 'Armbrust', damage: 15, range: 6, speed: 0.9, type: 'ranged' },
};

const RARITY = {
  common: { multiplier: 1.0, color: '#ffffff', chance: 0.6 },
  uncommon: { multiplier: 1.1, color: '#00ff00', chance: 0.25 },
  rare: { multiplier: 1.25, color: '#0088ff', chance: 0.12 },
  epic: { multiplier: 1.5, color: '#aa00ff', chance: 0.03 },
  legendary: { multiplier: 2.0, color: '#ffaa00', chance: 0.005 },
};

function generateWeapon(level) {
  const types = Object.keys(WEAPONS);
  const type = types[Math.floor(Math.random() * types.length)];
  const base = WEAPONS[type];

  let rarity = 'common';
  let roll = Math.random();
  for (const [r, data] of Object.entries(RARITY)) {
    if (roll < data.chance) {
      rarity = r;
      break;
    }
    roll -= data.chance;
  }

  return {
    type,
    name: `${rarity === 'common' ? '' : `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} `}${base.name}`,
    damage: Math.floor(base.damage * RARITY[rarity].multiplier * (1 + level * 0.1)),
    range: base.range,
    speed: base.speed,
    weaponType: base.type,
    rarity,
    color: RARITY[rarity].color,
  };
}

function createGameServer(options = {}) {
  const app = express();
  const httpServer = http.createServer(app);
  const io = new Server(httpServer);
  const port = options.port ?? (Number(process.env.PORT) || 3000);
  const host = options.host ?? '0.0.0.0';

  const staticDir = prepareStaticAssets();

  app.use(express.static(staticDir));
  app.get('/', (_req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });

  const gameState = {
    players: {},
    dungeons: {},
    enemies: {},
  };

  io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    socket.on('login', (data) => {
      const player = {
        id: socket.id,
        name: data.name || 'Adventurer',
        level: 1,
        xp: 0,
        hp: 100,
        maxHp: 100,
        x: 0,
        y: 0,
        weapon: generateWeapon(0),
        inventory: [],
        dungeonLevel: 1,
        direction: { x: 0, y: 1 },
      };

      gameState.players[socket.id] = player;

      if (!gameState.dungeons[player.dungeonLevel]) {
        gameState.dungeons[player.dungeonLevel] = new Dungeon(player.dungeonLevel);
      }

      const dungeon = gameState.dungeons[player.dungeonLevel];
      dungeon.players.add(socket.id);

      player.x = dungeon.startPos.x;
      player.y = dungeon.startPos.y;

      socket.join(`dungeon_${player.dungeonLevel}`);

      socket.emit('init', { player, dungeon, enemies: dungeon.enemies });
      socket.to(`dungeon_${player.dungeonLevel}`).emit('playerJoined', player);
    });

    socket.on('move', (data) => {
      const player = gameState.players[socket.id];
      if (!player) return;

      const dungeon = gameState.dungeons[player.dungeonLevel];
      const newX = player.x + data.dx;
      const newY = player.y + data.dy;

      if (
        newX >= 0 &&
        newX < dungeon.width &&
        newY >= 0 &&
        newY < dungeon.height &&
        dungeon.map[newY][newX] !== 1
      ) {
        player.x = newX;
        player.y = newY;
        player.direction = { x: data.dx || 0, y: data.dy || 1 };

        if (newX === dungeon.endPos.x && newY === dungeon.endPos.y) {
          if (dungeon.enemies.every((e) => !e.alive)) {
            const drop = Math.random() < 0.3 ? generateWeapon(player.dungeonLevel) : null;

            player.dungeonLevel++;
            if (!gameState.dungeons[player.dungeonLevel]) {
              gameState.dungeons[player.dungeonLevel] = new Dungeon(player.dungeonLevel);
            }

            const newDungeon = gameState.dungeons[player.dungeonLevel];
            newDungeon.players.add(socket.id);

            player.x = newDungeon.startPos.x;
            player.y = newDungeon.startPos.y;

            socket.leave(`dungeon_${player.dungeonLevel - 1}`);
            socket.join(`dungeon_${player.dungeonLevel}`);

            socket.emit('levelUp', {
              dungeon: newDungeon,
              enemies: newDungeon.enemies,
              drop,
              player,
            });
          }
        }

        io.to(`dungeon_${player.dungeonLevel}`).emit('playerMoved', player);
      }
    });

    socket.on('attack', () => {
      const player = gameState.players[socket.id];
      if (!player) return;

      const dungeon = gameState.dungeons[player.dungeonLevel];
      const weapon = player.weapon;
      const range = weapon.range;
      let hitSomething = false;

      dungeon.enemies.forEach((enemy) => {
        if (!enemy.alive) return;

        const dist = Math.sqrt(Math.pow(enemy.x - player.x, 2) + Math.pow(enemy.y - player.y, 2));

        if (dist <= range) {
          if (weapon.weaponType === 'ranged' && !hasLineOfSight(dungeon, player, enemy)) return;

          enemy.hp -= player.weapon.damage;
          hitSomething = true;

          if (enemy.hp <= 0) {
            enemy.alive = false;
            player.xp += 10 + dungeon.level * 5;

            if (player.xp >= player.level * 100) {
              player.level++;
              player.maxHp += 20;
              player.hp = player.maxHp;
            }
          }
        }
      });

      if (hitSomething || weapon.weaponType === 'ranged') {
        io.to(`dungeon_${player.dungeonLevel}`).emit('attack', {
          attacker: player.id,
          enemies: dungeon.enemies,
          weapon: weapon.weaponType,
        });
      }

      processEnemyTurn(dungeon, player.dungeonLevel);
    });

    socket.on('pickupWeapon', (data) => {
      const player = gameState.players[socket.id];
      if (!player || !data.weapon) return;

      player.inventory.push(player.weapon);
      player.weapon = data.weapon;

      socket.emit('weaponUpdated', player);
    });

    socket.on('disconnect', () => {
      const player = gameState.players[socket.id];
      if (player) {
        const dungeon = gameState.dungeons[player.dungeonLevel];
        if (dungeon) dungeon.players.delete(socket.id);
        delete gameState.players[socket.id];
      }
      console.log('Player disconnected:', socket.id);
    });
  });

  function hasLineOfSight(dungeon, from, to) {
    let x = from.x;
    let y = from.y;
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    const xStep = from.x < to.x ? 1 : -1;
    const yStep = from.y < to.y ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (x === to.x && y === to.y) return true;
      if (dungeon.map[y][x] === 1) return false;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += xStep;
      }
      if (e2 < dx) {
        err += dx;
        y += yStep;
      }
    }
  }

  function processEnemyTurn(dungeon, level) {
    const players = Array.from(dungeon.players)
      .map((id) => gameState.players[id])
      .filter(Boolean);

    dungeon.enemies.forEach((enemy) => {
      if (!enemy.alive) return;

      let nearest = null;
      let nearestDist = Infinity;

      players.forEach((player) => {
        const dist = Math.sqrt(Math.pow(player.x - enemy.x, 2) + Math.pow(player.y - enemy.y, 2));
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = player;
        }
      });

      if (!nearest) return;

      if (nearestDist > 1) {
        const dx = Math.sign(nearest.x - enemy.x);
        const dy = Math.sign(nearest.y - enemy.y);

        const newX = enemy.x + dx;
        const newY = enemy.y + dy;

        if (dx !== 0 && dungeon.map[enemy.y][newX] !== 1) {
          enemy.x = newX;
        } else if (dy !== 0 && dungeon.map[newY][enemy.x] !== 1) {
          enemy.y = newY;
        }
      }

      nearestDist = Math.sqrt(Math.pow(nearest.x - enemy.x, 2) + Math.pow(nearest.y - enemy.y, 2));
      if (nearestDist <= 1.5) {
        nearest.hp -= enemy.damage;

        if (nearest.hp <= 0) {
          nearest.hp = nearest.maxHp;
          nearest.x = dungeon.startPos.x;
          nearest.y = dungeon.startPos.y;
          io.to(nearest.id).emit('died', { player: nearest });
        }
      }
    });

    io.to(`dungeon_${level}`).emit('enemiesUpdated', dungeon.enemies);
  }

  async function start() {
    await new Promise((resolve, reject) => {
      httpServer.once('error', reject);
      httpServer.listen(port, host, () => {
        httpServer.off('error', reject);
        resolve();
      });
    });

    return httpServer.address();
  }

  async function stop() {
    if (!httpServer.listening) {
      return;
    }

    await new Promise((resolve, reject) => {
      io.close(() => {
        httpServer.close((error) => {
          if (error && error.code !== 'ERR_SERVER_NOT_RUNNING') reject(error);
          else resolve();
        });
      });
    });
  }

  return {
    app,
    io,
    host,
    port,
    httpServer,
    gameState,
    start,
    stop,
  };
}

module.exports = {
  createGameServer,
};
