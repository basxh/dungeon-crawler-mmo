const TILE_SIZE = 16;
const VIEWPORT_WIDTH = 40;
const VIEWPORT_HEIGHT = 30;

let socket = null;
let player = null;
let dungeon = null;
let enemies = [];
let lastDrop = null;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size based on dungeon size
canvas.width = VIEWPORT_WIDTH * TILE_SIZE;
canvas.height = VIEWPORT_HEIGHT * TILE_SIZE;

// Input handling
const keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    if (e.code === 'Space') {
        e.preventDefault();
        attack();
    }
    if (e.key.toLowerCase() === 'e' && lastDrop) {
        pickupDrop();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Movement handling
let lastMoveTime = 0;
const MOVE_DELAY = 150; // ms between moves

function handleInput() {
    if (!player || !dungeon) return;
    
    const now = Date.now();
    if (now - lastMoveTime < MOVE_DELAY) return;
    
    let dx = 0, dy = 0;
    
    if (keys['w'] || keys['arrowup']) dy = -1;
    else if (keys['s'] || keys['arrowdown']) dy = 1;
    else if (keys['a'] || keys['arrowleft']) dx = -1;
    else if (keys['d'] || keys['arrowright']) dx = 1;
    
    if (dx !== 0 || dy !== 0) {
        socket.emit('move', { dx, dy });
        lastMoveTime = now;
    }
}

function attack() {
    if (!player || !socket) return;
    socket.emit('attack', {});
}

function pickupDrop() {
    if (!lastDrop || !socket) return;
    socket.emit('pickupWeapon', { weapon: lastDrop });
    lastDrop = null;
    document.getElementById('levelComplete').style.display = 'none';
}

// Render
function render() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (!player || !dungeon) return;
    
    // Calculate viewport
    let startX = Math.max(0, player.x - VIEWPORT_WIDTH / 2);
    let startY = Math.max(0, player.y - VIEWPORT_HEIGHT / 2);
    startX = Math.min(startX, dungeon.width - VIEWPORT_WIDTH);
    startY = Math.min(startY, dungeon.height - VIEWPORT_HEIGHT);
    
    // Draw map
    for (let y = 0; y < VIEWPORT_HEIGHT; y++) {
        for (let x = 0; x < VIEWPORT_WIDTH; x++) {
            const mapX = Math.floor(startX + x);
            const mapY = Math.floor(startY + y);
            
            if (mapY >= 0 && mapY < dungeon.height && mapX >= 0 && mapX < dungeon.width) {
                const tile = dungeon.map[mapY][mapX];
                const screenX = x * TILE_SIZE;
                const screenY = y * TILE_SIZE;
                
                switch (tile) {
                    case 0: // Floor
                        ctx.fillStyle = '#2d3a4a';
                        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                        break;
                    case 1: // Wall
                        ctx.fillStyle = '#4a5568';
                        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                        ctx.strokeStyle = '#2d3748';
                        ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                        break;
                    case 2: // Start
                        ctx.fillStyle = '#2d3a4a';
                        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                        ctx.fillStyle = '#e94560';
                        ctx.beginPath();
                        ctx.arc(screenX + TILE_SIZE/2, screenY + TILE_SIZE/2, 4, 0, Math.PI * 2);
                        ctx.fill();
                        break;
                    case 3: // End
                        ctx.fillStyle = '#2d3a4a';
                        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                        ctx.fillStyle = '#4ecca3';
                        ctx.beginPath();
                        ctx.arc(screenX + TILE_SIZE/2, screenY + TILE_SIZE/2, 6, 0, Math.PI * 2);
                        ctx.fill();
                        break;
                }
            }
        }
    }
    
    // Draw enemies
    enemies.forEach(enemy => {
        if (!enemy.alive) return;
        const screenX = (enemy.x - startX) * TILE_SIZE;
        const screenY = (enemy.y - startY) * TILE_SIZE;
        
        if (screenX >= 0 && screenX < canvas.width && screenY >= 0 && screenY < canvas.height) {
            // Enemy color based on type
            const colors = {
                goblin: '#4ade80',
                skeleton: '#f3f4f6',
                orc: '#166534',
                spider: '#6b7280',
                bat: '#1f2937'
            };
            
            ctx.fillStyle = colors[enemy.type] || '#666';
            ctx.fillRect(screenX + 2, screenY + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            
            // HP bar
            const hpPercent = enemy.hp / enemy.maxHp;
            ctx.fillStyle = '#333';
            ctx.fillRect(screenX + 2, screenY - 4, TILE_SIZE - 4, 4);
            ctx.fillStyle = hpPercent > 0.5 ? '#4ade80' : hpPercent > 0.25 ? '#fbbf24' : '#ef4444';
            ctx.fillRect(screenX + 2, screenY - 4, (TILE_SIZE - 4) * hpPercent, 4);
        }
    });
    
    // Draw player
    const playerScreenX = (player.x - startX) * TILE_SIZE;
    const playerScreenY = (player.y - startY) * TILE_SIZE;
    
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(playerScreenX + TILE_SIZE/2, playerScreenY + TILE_SIZE/2, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Direction indicator
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playerScreenX + TILE_SIZE/2, playerScreenY + TILE_SIZE/2);
    ctx.lineTo(
        playerScreenX + TILE_SIZE/2 + player.direction.x * 8,
        playerScreenY + TILE_SIZE/2 + player.direction.y * 8
    );
    ctx.stroke();
    
    // Attack range indicator (faint)
    if (player.weapon) {
        ctx.strokeStyle = player.weapon.color + '33';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(playerScreenX + TILE_SIZE/2, playerScreenY + TILE_SIZE/2, player.weapon.range * TILE_SIZE, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// Game loop
function gameLoop() {
    handleInput();
    render();
    requestAnimationFrame(gameLoop);
}

// Socket event handlers
function initSocket() {
    socket = io();
    
    socket.on('init', (data) => {
        player = data.player;
        dungeon = data.dungeon;
        enemies = data.enemies;
        updateUI();
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'block';
    });
    
    socket.on('playerMoved', (data) => {
        if (data.id === socket.id) {
            player = data;
        }
    });
    
    socket.on('enemiesUpdated', (data) => {
        enemies = data;
    });
    
    socket.on('attack', (data) => {
        // Show attack effect
        showAttackEffect(data);
    });
    
    socket.on('died', (data) => {
        alert('Du bist gestorben! Du wirst am Startpunkt wiederbelebt.');
        player = data.player;
        updateUI();
    });
    
    socket.on('levelUp', (data) => {
        player = data.player;
        dungeon = data.dungeon;
        enemies = data.enemies;
        
        if (data.drop) {
            lastDrop = data.drop;
            const rarityClass = `rarity-${data.drop.rarity}`;
            document.getElementById('lootDisplay').innerHTML = `
                <p class="${rarityClass}"><strong>${data.drop.name}</strong></p>
                <p>Schaden: ${data.drop.damage}</p>
                <p>Reichweite: ${data.drop.range}</p>
                <p>Drücke E zum aufheben</p>
            `;
            document.getElementById('levelComplete').style.display = 'block';
        } else {
            dungeon = data.dungeon;
            enemies = data.enemies;
        }
        
        updateUI();
    });
    
    socket.on('weaponUpdated', (data) => {
        player = data;
        updateUI();
    });
    
    socket.on('playerJoined', (data) => {
        console.log('Player joined:', data.name);
    });
}

function showAttackEffect(data) {
    // Simple visual feedback for attacks
    // Could be expanded with particles, etc.
}

function updateUI() {
    if (!player) return;
    
    document.getElementById('playerNameDisplay').textContent = `Name: ${player.name}`;
    document.getElementById('playerLevel').textContent = `Level: ${player.level}`;
    document.getElementById('playerXp').textContent = `XP: ${player.xp}/${player.level * 100}`;
    document.getElementById('hpBar').style.width = `${(player.hp / player.maxHp) * 100}%`;
    document.getElementById('hpText').textContent = `${player.hp}/${player.maxHp}`;
    document.getElementById('dungeonLevel').textContent = `Dungeon: ${player.dungeonLevel}`;
    
    if (player.weapon) {
        const w = player.weapon;
        const rarityClass = `rarity-${w.rarity}`;
        document.getElementById('weaponName').innerHTML = `<span class="${rarityClass}">${w.name}</span>`;
        document.getElementById('weaponDamage').textContent = `Schaden: ${w.damage}`;
        document.getElementById('weaponRange').textContent = `Reichweite: ${w.range}`;
        document.getElementById('weaponSpeed').textContent = `Geschwindigkeit: ${w.speed}x`;
    }
}

function continueToNextLevel() {
    document.getElementById('levelComplete').style.display = 'none';
    lastDrop = null;
}

function startGame() {
    const name = document.getElementById('playerName').value || 'Adventurer';
    initSocket();
    socket.emit('login', { name });
    gameLoop();
}
