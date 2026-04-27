export function createInputController({ onMove, onAttack, onPickupDrop, canPickupDrop }) {
  const keys = {};
  let lastMoveTime = 0;
  const MOVE_DELAY = 150;

  function handleKeyDown(event) {
    keys[event.key.toLowerCase()] = true;

    if (event.code === 'Space') {
      event.preventDefault();
      onAttack();
    }

    if (event.key.toLowerCase() === 'e' && canPickupDrop()) {
      onPickupDrop();
    }
  }

  function handleKeyUp(event) {
    keys[event.key.toLowerCase()] = false;
  }

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);

  function update() {
    const now = Date.now();
    if (now - lastMoveTime < MOVE_DELAY) {
      return;
    }

    let dx = 0;
    let dy = 0;

    if (keys.w || keys.arrowup) dy = -1;
    else if (keys.s || keys.arrowdown) dy = 1;
    else if (keys.a || keys.arrowleft) dx = -1;
    else if (keys.d || keys.arrowright) dx = 1;

    if (dx !== 0 || dy !== 0) {
      onMove({ dx, dy });
      lastMoveTime = now;
    }
  }

  function dispose() {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
  }

  return {
    update,
    dispose,
  };
}
