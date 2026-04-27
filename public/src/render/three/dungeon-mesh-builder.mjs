export function buildDungeonRenderData(dungeon) {
  if (!dungeon?.map?.length) {
    return {
      floors: [],
      walls: [],
      start: null,
      exit: null,
      bounds: { width: 0, depth: 0 },
    };
  }

  const floors = [];
  const walls = [];
  let start = null;
  let exit = null;

  for (let z = 0; z < dungeon.height; z += 1) {
    for (let x = 0; x < dungeon.width; x += 1) {
      const tile = dungeon.map[z][x];

      if (tile === 1) {
        walls.push({ x, z, tile });
        continue;
      }

      floors.push({ x, z, tile });

      if (tile === 2) {
        start = { x, z };
      } else if (tile === 3) {
        exit = { x, z };
      }
    }
  }

  return {
    floors,
    walls,
    start,
    exit,
    bounds: {
      width: dungeon.width,
      depth: dungeon.height,
    },
  };
}

export function gridToWorldPosition(tileX, tileZ, bounds) {
  return {
    x: tileX - bounds.width / 2 + 0.5,
    z: tileZ - bounds.depth / 2 + 0.5,
  };
}
