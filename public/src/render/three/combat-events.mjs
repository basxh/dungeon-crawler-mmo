export function buildEnemyCombatEvents(previousEnemies = [], nextEnemies = []) {
  const previousById = new Map(previousEnemies.map((enemy) => [enemy.id, enemy]));
  const events = [];

  nextEnemies.forEach((enemy) => {
    const previous = previousById.get(enemy.id);
    if (!previous) {
      return;
    }

    const damage = Math.max(0, (previous.hp ?? 0) - (enemy.hp ?? 0));
    if (damage > 0) {
      events.push({
        id: enemy.id,
        type: 'hit',
        damage,
        x: enemy.x,
        y: enemy.y,
      });
    }

    if (previous.alive && !enemy.alive) {
      events.push({
        id: enemy.id,
        type: 'death',
        damage: 0,
        x: enemy.x,
        y: enemy.y,
      });
    }
  });

  return events;
}
