const DEFAULT_STATE = {
  connected: false,
  player: null,
  dungeon: null,
  enemies: [],
  lastDrop: null,
  combatEvents: [],
  playerDidAttack: false,
  playerTookDamage: false,
  statusMessage: 'Verbinde zum Dungeon...'
};

export function createGameStateStore(initialState = {}) {
  let state = { ...DEFAULT_STATE, ...initialState };
  const subscribers = new Set();

  function getState() {
    return state;
  }

  function setState(partialState) {
    state = { ...state, ...partialState };
    subscribers.forEach((subscriber) => subscriber(state));
    return state;
  }

  function subscribe(subscriber) {
    subscribers.add(subscriber);
    return () => subscribers.delete(subscriber);
  }

  return {
    getState,
    setState,
    subscribe,
  };
}
