import { createGameStateStore } from './state/game-state.mjs';
import { createUIController } from './ui/ui-controller.mjs';
import { createInputController } from './input/input-controller.mjs';
import { createSocketClient } from './net/socket-client.mjs';
import { ThreeRenderer } from './render/three/three-renderer.mjs';

const store = createGameStateStore({
  statusMessage: 'Bereit für den 3D-Dungeon.',
});
const ui = createUIController();
const renderer = new ThreeRenderer(document.getElementById('gameViewport'));
let hasStartedLoop = false;
let inputController = null;

function pickupDrop() {
  const state = store.getState();
  if (state.lastDrop) {
    socketClient.emitPickupWeapon(state.lastDrop);
  }
}

const socketClient = createSocketClient({
  store,
  ui,
  onReady: () => {
    if (!inputController) {
      inputController = createInputController({
        onMove: ({ dx, dy }) => socketClient.emitMove({ dx, dy }),
        onAttack: () => socketClient.emitAttack(),
        onPickupDrop: () => pickupDrop(),
        canPickupDrop: () => Boolean(store.getState().lastDrop),
      });
    }

    if (!hasStartedLoop) {
      hasStartedLoop = true;
      startRenderLoop();
    }
  },
});

store.subscribe((state) => {
  ui.updateFromState(state);
});
ui.updateFromState(store.getState());

function startRenderLoop() {
  let lastFrame = performance.now();

  function frame(now) {
    const deltaSeconds = Math.min((now - lastFrame) / 1000, 0.1);
    lastFrame = now;

    inputController?.update();
    renderer.render(store.getState(), deltaSeconds);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function beginGame() {
  ui.showConnectingState();
  const name = ui.elements.playerNameInput.value || 'Adventurer';
  socketClient.connect(name);
}

ui.elements.startButton.addEventListener('click', beginGame);
ui.elements.playerNameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !ui.elements.startButton.disabled) {
    beginGame();
  }
});

document.getElementById('continueButton').addEventListener('click', () => {
  store.setState({ lastDrop: null, statusMessage: 'Weiter tiefer in den Dungeon...' });
});

window.addEventListener('beforeunload', () => {
  inputController?.dispose();
  renderer.dispose();
});
