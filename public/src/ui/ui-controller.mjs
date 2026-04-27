function setText(element, text) {
  if (element) {
    element.textContent = text;
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
