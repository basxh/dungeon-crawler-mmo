import { BASE_STATUS } from '../render/three/three-renderer.mjs';
import { buildEnemyCombatEvents } from '../render/three/combat-events.mjs';

export function createSocketClient({ store, ui, onReady }) {
  let socket = null;

  function restoreBaseStatus(delay = 900) {
    setTimeout(() => {
      if (store.getState().connected) {
        store.setState({ statusMessage: BASE_STATUS });
      }
    }, delay);
  }

  function connect(playerName) {
    socket = io();

    socket.on('connect', () => {
      store.setState({ statusMessage: 'Verbindung steht. Betrete Dungeon...' });
      socket.emit('login', { name: playerName || 'Adventurer' });
    });

    socket.on('connect_error', () => {
      store.setState({ statusMessage: 'Verbindung fehlgeschlagen.' });
      ui.resetStartButton();
    });

    socket.on('init', (data) => {
      store.setState({
        connected: true,
        player: data.player,
        dungeon: data.dungeon,
        enemies: data.enemies,
        lastDrop: null,
        combatEvents: [],
        playerDidAttack: false,
        playerTookDamage: false,
        statusMessage: BASE_STATUS,
      });
      ui.showGame();
      ui.resetStartButton();
      onReady();
    });

    socket.on('playerMoved', (data) => {
      if (data.id === socket.id) {
        store.setState({ player: data });
      }
    });

    socket.on('playerUpdated', (player) => {
      const currentState = store.getState();
      store.setState({
        player,
        playerTookDamage: (currentState.player?.hp ?? player.hp) > player.hp,
        statusMessage: `Treffer erhalten! HP ${player.hp}/${player.maxHp}`,
      });
      restoreBaseStatus(850);
    });

    socket.on('enemiesUpdated', (data) => {
      const currentState = store.getState();
      const combatEvents = buildEnemyCombatEvents(currentState.enemies, data);
      store.setState({
        enemies: data,
        combatEvents,
      });
    });

    socket.on('attack', () => {
      const currentState = store.getState();
      store.setState({
        statusMessage: `${currentState.player?.weapon?.name || 'Waffe'} eingesetzt.`,
        playerDidAttack: true,
      });
      restoreBaseStatus(700);
    });

    socket.on('died', (data) => {
      store.setState({
        player: data.player,
        playerTookDamage: true,
        statusMessage: 'Du wurdest besiegt und am Startpunkt wiederbelebt.',
      });
      restoreBaseStatus(1200);
    });

    socket.on('levelUp', (data) => {
      store.setState({
        player: data.player,
        dungeon: data.dungeon,
        enemies: data.enemies,
        lastDrop: data.drop || null,
        combatEvents: [],
        statusMessage: data.drop ? 'Neuer Loot gefunden!' : 'Dungeon-Level abgeschlossen!',
      });
    });

    socket.on('weaponUpdated', (data) => {
      store.setState({ player: data, lastDrop: null, statusMessage: 'Neue Waffe ausgerüstet.' });
      restoreBaseStatus();
    });

    socket.on('playerJoined', (data) => {
      const state = store.getState();
      store.setState({ statusMessage: `${data.name} ist dem Dungeon beigetreten.` });
      if (state.player) {
        restoreBaseStatus(1200);
      }
    });

    socket.on('disconnect', () => {
      store.setState({ connected: false, statusMessage: 'Verbindung getrennt.' });
      ui.resetStartButton();
    });
  }

  return {
    connect,
    emitMove: (payload) => socket?.emit('move', payload),
    emitAttack: () => socket?.emit('attack', {}),
    emitPickupWeapon: (weapon) => socket?.emit('pickupWeapon', { weapon }),
    getSocket: () => socket,
  };
}
