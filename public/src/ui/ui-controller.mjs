import { buildMinimapModel } from './minimap-model.mjs';

function setText(element, text) {
  if (element) {
    element.textContent = text;
  }
}

function drawMinimap(canvas, model) {
  if (!canvas) {
    return;
  }

  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);

  if (!model.width || !model.height) {
    return;
  }

  const tileSize = Math.floor(Math.min(canvas.width / model.width, canvas.height / model.height));
  const offsetX = Math.floor((canvas.width - model.width * tileSize) / 2);
  const offsetY = Math.floor((canvas.height - model.height * tileSize) / 2);

  const colors = {
    wall: '#0f172a',
    floor: '#29435c',
    start: '#e94560',
    exit: '#4ecca3',
    enemy: '#fbbf24',
    player: '#60a5fa',
    grid: 'rgba(255,255,255,0.08)',
  };

  model.tiles.forEach((tile) => {
    let fill = colors.floor;
    if (tile.tile === 1) fill = colors.wall;
    if (tile.tile === 2) fill = colors.start;
    if (tile.tile === 3) fill = colors.exit;

    context.fillStyle = fill;
    context.fillRect(offsetX + tile.x * tileSize, offsetY + tile.y * tileSize, tileSize, tileSize);
    context.strokeStyle = colors.grid;
    context.strokeRect(offsetX + tile.x * tileSize, offsetY + tile.y * tileSize, tileSize, tileSize);
  });

  model.enemies.forEach((enemy) => {
    context.fillStyle = colors.enemy;
    context.beginPath();
    context.arc(
      offsetX + enemy.x * tileSize + tileSize / 2,
      offsetY + enemy.y * tileSize + tileSize / 2,
      Math.max(2, tileSize * 0.2),
      0,
      Math.PI * 2
    );
    context.fill();
  });

  if (model.player) {
    context.fillStyle = colors.player;
    context.beginPath();
    context.arc(
      offsetX + model.player.x * tileSize + tileSize / 2,
      offsetY + model.player.y * tileSize + tileSize / 2,
      Math.max(3, tileSize * 0.26),
      0,
      Math.PI * 2
    );
    context.fill();
  }
}

export function createUIController() {
  const elements = {
    loginScreen: document.getElementById('loginScreen'),
    gameScreen: document.getElementById('gameScreen'),
    statusMessage: document.getElementById('statusMessage'),
    playerNameInput: document.getElementById('playerName'),
    startButton: document.getElementById('startButton'),
    playerNameDisplay: document.getElementById('playerNameDisplay'),
    playerLevel: document.getElementById('playerLevel'),
    playerXp: document.getElementById('playerXp'),
    hpBar: document.getElementById('hpBar'),
    hpText: document.getElementById('hpText'),
    dungeonLevel: document.getElementById('dungeonLevel'),
    weaponName: document.getElementById('weaponName'),
    weaponDamage: document.getElementById('weaponDamage'),
    weaponRange: document.getElementById('weaponRange'),
    weaponSpeed: document.getElementById('weaponSpeed'),
    levelComplete: document.getElementById('levelComplete'),
    lootDisplay: document.getElementById('lootDisplay'),
    minimapCanvas: document.getElementById('minimapCanvas'),
  };

  function showConnectingState() {
    if (elements.startButton) {
      elements.startButton.disabled = true;
      elements.startButton.textContent = 'Betrete Dungeon...';
    }
    setStatus('Verbindung wird aufgebaut...');
  }

  function resetStartButton() {
    if (elements.startButton) {
      elements.startButton.disabled = false;
      elements.startButton.textContent = 'Spielen';
    }
  }

  function setStatus(message) {
    setText(elements.statusMessage, message);
  }

  function showGame() {
    if (elements.loginScreen) elements.loginScreen.style.display = 'none';
    if (elements.gameScreen) elements.gameScreen.style.display = 'block';
  }

  function updateFromState(state) {
    if (!state.player) {
      return;
    }

    setText(elements.playerNameDisplay, `Name: ${state.player.name}`);
    setText(elements.playerLevel, `Level: ${state.player.level}`);
    setText(elements.playerXp, `XP: ${state.player.xp}/${state.player.level * 100}`);
    if (elements.hpBar) {
      elements.hpBar.style.width = `${(state.player.hp / state.player.maxHp) * 100}%`;
    }
    setText(elements.hpText, `${state.player.hp}/${state.player.maxHp}`);
    setText(elements.dungeonLevel, `Dungeon: ${state.player.dungeonLevel}`);

    if (state.player.weapon) {
      const w = state.player.weapon;
      elements.weaponName.innerHTML = `<span class="rarity-${w.rarity}">${w.name}</span>`;
      setText(elements.weaponDamage, `Schaden: ${w.damage}`);
      setText(elements.weaponRange, `Reichweite: ${w.range}`);
      setText(elements.weaponSpeed, `Geschwindigkeit: ${w.speed}x`);
    }

    if (state.lastDrop) {
      elements.lootDisplay.innerHTML = `
        <p class="rarity-${state.lastDrop.rarity}"><strong>${state.lastDrop.name}</strong></p>
        <p>Schaden: ${state.lastDrop.damage}</p>
        <p>Reichweite: ${state.lastDrop.range}</p>
        <p>Drücke E zum Aufheben</p>
      `;
      elements.levelComplete.style.display = 'block';
    } else if (elements.levelComplete) {
      elements.levelComplete.style.display = 'none';
    }

    drawMinimap(elements.minimapCanvas, buildMinimapModel(state));

    if (state.statusMessage) {
      setStatus(state.statusMessage);
    }
  }

  return {
    elements,
    showConnectingState,
    resetStartButton,
    setStatus,
    showGame,
    updateFromState,
  };
}
