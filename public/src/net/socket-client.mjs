export function createSocketClient({ store, ui, onReady }) {
  let socket = null;

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
        statusMessage: '3D-Dungeon bereit. WASD zum Bewegen, Leertaste zum Angreifen.',
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

    socket.on('enemiesUpdated', (data) => {
      store.setState({ enemies: data });
    });

    socket.on('attack', () => {
      const currentState = store.getState();
      store.setState({ statusMessage: `${currentState.player?.weapon?.name || 'Waffe'} eingesetzt.` });
    });

    socket.on('died', (data) => {
      alert('Du bist gestorben! Du wirst am Startpunkt wiederbelebt.');
      store.setState({ player: data.player, statusMessage: 'Wiederbelebung am Startpunkt.' });
    });

    socket.on('levelUp', (data) => {
      store.setState({
        player: data.player,
        dungeon: data.dungeon,
        enemies: data.enemies,
        lastDrop: data.drop || null,
        statusMessage: data.drop ? 'Neuer Loot gefunden!' : 'Dungeon-Level abgeschlossen!',
      });
    });

    socket.on('weaponUpdated', (data) => {
      store.setState({ player: data, lastDrop: null, statusMessage: 'Neue Waffe ausgerüstet.' });
    });

    socket.on('playerJoined', (data) => {
      const state = store.getState();
      store.setState({ statusMessage: `${data.name} ist dem Dungeon beigetreten.` });
      if (state.player) {
        setTimeout(() => {
          const latestState = store.getState();
          if (latestState.player) {
            store.setState({ statusMessage: '3D-Dungeon bereit. WASD zum Bewegen, Leertaste zum Angreifen.' });
          }
        }, 1200);
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
