const { exec } = require('child_process');
const { createGameServer } = require('./server/app');

function openBrowser(url) {
  const escapedUrl = url.replace(/&/g, '^&');

  if (process.platform === 'win32') {
    exec(`start "" "${escapedUrl}"`, { shell: 'cmd.exe' });
    return;
  }

  if (process.platform === 'darwin') {
    exec(`open "${url}"`);
    return;
  }

  exec(`xdg-open "${url}"`);
}

async function main() {
  const requestedPort = process.env.PORT ? Number(process.env.PORT) : 0;
  const gameServer = createGameServer({ port: requestedPort });
  const address = await gameServer.start();
  const url = `http://127.0.0.1:${address.port}`;

  console.log(`Dungeon Crawler MMO gestartet: ${url}`);

  if (process.env.NO_OPEN !== '1') {
    openBrowser(url);
  }

  const shutdown = async () => {
    try {
      await gameServer.stop();
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Desktop-Start fehlgeschlagen:', error);
  process.exit(1);
});
