const { createGameServer } = require('./app');
const { CLASSES, SkillTree, createPlayerWithClass } = require('./skills');

async function main() {
  const gameServer = createGameServer();
  const address = await gameServer.start();
  const host = address.address === '::' ? 'localhost' : address.address;
  console.log(`Dungeon Crawler MMO server running on http://${host}:${address.port}`);
}

main().catch((error) => {
  console.error('Failed to start Dungeon Crawler MMO server:', error);
  process.exit(1);
});
