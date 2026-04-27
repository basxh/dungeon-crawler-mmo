export function buildMinimapModel(state) {
  const dungeon = state.dungeon;
  if (!dungeon?.map?.length) {
    return {
      width: 0,
      height: 0,
      tiles: [],
      player: null,
      enemies: [],
      start: null,
      exit: null,
    };
  }

  const tiles = [];
  let start = null;
  let exit = null;

  for (let y = 0; y < dungeon.height; y += 1) {
    for (let x = 0; x < dungeon.width; x += 1) {
      const tile = dungeon.map[y][x];
      tiles.push({ x, y, tile });
      if (tile === 2) start = { x, y };
      if (tile === 3) exit = { x, y };
    }
  }

  return {
    width: dungeon.width,
    height: dungeon.height,
    tiles,
    player: state.player ? { x: state.player.x, y: state.player.y } : null,
    enemies: (state.enemies || [])
      .filter((enemy) => enemy.alive)
      .map((enemy) => ({ id: enemy.id, x: enemy.x, y: enemy.y })),
    start,
    exit,
  };
}
