# ConjugQuest ⚔️

A browser-based French verb conjugation platformer game. Run, jump, and battle enemies by conjugating French verbs correctly.

## Gameplay

- Move left/right and jump across platforms
- Touch an enemy to trigger a conjugation duel
- Choose the correct conjugation from 4 options to defeat it
- Collect stars, spend them in the shop to unlock new heroes
- Reach the flag at the end of each level to progress

**Controls**
- Arrow keys / WASD or on-screen buttons to move
- Space / Up arrow or the jump button to jump

## Levels

| # | Name | Enemy | Tense |
|---|------|-------|-------|
| 1 | La Forêt Magique | Goblin | Présent (Groupe 1) |
| 2 | La Rivière Périlleuse | Skeleton | Présent & Imparfait (Groupe 1) |
| 3 | Le Château Sombre | Goblin | Présent (Groupe 1 + 2) |
| 4 | Les Cavernes Profondes | Skeleton | Présent & Imparfait (Groupe 2) |
| 5 | Le Dragon Final | Dragon | Présent & Futur simple (Groupe 3) |

## Heroes (Shop)

Earn coins by collecting stars. Spend them to unlock new playable characters:

| Hero | Cost | Description |
|------|------|-------------|
| Chevalier | Free | Default knight in silver armor |
| Mage | 30 🪙 | Wizard with blue robes and magic staff |
| Ninja | 60 🪙 | Stealthy warrior in black |
| Pirate | 100 🪙 | Captain with tricorne and cutlass |

## Tech Stack

- Vanilla HTML5 Canvas + JavaScript (no framework, no build step)
- Pixel art sprites generated with [PixelLab](https://pixellab.ai)
- Physics: AABB collision, gravity, one-way platforms
- Persistent save data via `localStorage`

## Project Structure

```
ConjugQuest/
├── index.html          # Game shell + UI screens + CSS
├── js/
│   ├── data.js         # Verb database + level definitions
│   ├── sprites.js      # Pixel-art sprite data (fallback)
│   └── game.js         # Game loop, physics, rendering
└── assets/
    ├── heroes/         # Hero sprite sheets (paladin, mage, ninja, pirate)
    ├── enemies/        # Enemy sprite sheets
    └── levels/         # Per-biome backgrounds + platforms + pillars + tower/gates
```

## Running Locally

No build step needed — just open `index.html` in a browser:

```bash
# Any static file server works, e.g.:
npx serve .
# or
python3 -m http.server
```

> Opening `index.html` directly as a `file://` URL works in most browsers, but a local server avoids any CORS issues with asset loading.

## Graphics Style

The game supports two render modes toggled in Settings:

- **Simple** — hand-crafted pixel-art drawn procedurally on canvas
- **Advanced** — AI-generated sprite sheets from PixelLab, with full walk/run/jump animations

## Credits

- Verb data: standard French curriculum (groupes 1, 2, 3)
- Character & enemy sprites: [PixelLab](https://pixellab.ai)
- Background art: generated with AI image tools
- Game design & code: ConjugQuest contributors

## License

MIT — see [LICENSE](LICENSE)
