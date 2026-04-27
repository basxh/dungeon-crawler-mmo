# Dungeon Crawler MMO

Browser-basiertes Dungeon Crawler MMO mit Procedural Generation, Loot-System und Echtzeit-Multiplayer.

## Features

- 🎮 Browser-basiertes Spiel (Canvas/WebGL)
- 🗺️ Procedural generierte Höhlen-Level
- ⚔️ Echtzeit-Kampfsystem
- 🛡️ Verschiedene Waffentypen (Bogen, Schwert, Axt, Streitkolben, Armbrust)
- 💎 Loot-System mit Seltenheitsstufen (Common → Legendary)
- 👥 Multiplayer via WebSocket
- 📈 Level-System

## Tech Stack

- Backend: Node.js + Express + Socket.io
- Frontend: HTML5 Canvas + Vanilla JS
- State: In-Memory (später Redis)

## Waffentypen

| Waffe | Schaden | Reichweite | Geschwindigkeit |
|-------|---------|------------|-----------------|
| Schwert (1H) | Mittel | Nah | Schnell |
| Schwert (2H) | Hoch | Nah | Langsam |
| Axt | Sehr hoch | Nah | Sehr langsam |
| Streitkolben | Hoch | Nah | Mittel |
| Bogen | Niedrig | Fern | Schnell |
| Armbrust | Mittel | Fern | Mittel |

## Seltenheitsstufen

1. **Common** (Weiß) - Basis-Stats
2. **Uncommon** (Grün) - +10% Stats
3. **Rare** (Blau) - +25% Stats
4. **Epic** (Lila) - +50% Stats
5. **Legendary** (Gold) - +100% Stats, Unique Effects

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000
