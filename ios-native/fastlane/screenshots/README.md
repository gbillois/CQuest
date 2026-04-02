# Screenshots for App Store Connect

Place your screenshots in the locale folders following fastlane naming conventions.

## Required screenshot sizes

### iPhone 6.9" (iPhone 16 Pro Max) — REQUIRED
- Resolution: 1320 x 2868 px (portrait) or 2868 x 1320 px (landscape)
- File naming: `1_forest_level.png`, `2_conjugation_quiz.png`, etc.

### iPhone 6.7" (iPhone 15 Pro Max / 14 Pro Max)
- Resolution: 1290 x 2796 px (portrait) or 2796 x 1290 px (landscape)

### iPhone 6.5" (iPhone 11 Pro Max / Xs Max)
- Resolution: 1242 x 2688 px (portrait) or 2688 x 1242 px (landscape)

### iPad Pro 13" (6th gen) — REQUIRED if supporting iPad
- Resolution: 2064 x 2752 px (portrait) or 2752 x 2064 px (landscape)

### iPad Pro 12.9" (2nd gen)
- Resolution: 2048 x 2732 px (portrait) or 2732 x 2048 px (landscape)

## Suggested screenshot content

1. **Forest Level** — Hero running through the forest biome (showcases core gameplay)
2. **Conjugation Quiz** — Active conjugation question during enemy encounter
3. **Hero Selection** — Shop screen showing 8 heroes available
4. **Boss Battle** — Dragon boss fight with timed challenge
5. **Desert/Snow Level** — Different biome showing visual variety
6. **Leaderboard** — Score tracking screen

## Folder structure

```
screenshots/
├── en-US/
│   ├── 1_forest_level.png
│   ├── 2_conjugation_quiz.png
│   ├── 3_hero_selection.png
│   ├── 4_boss_battle.png
│   ├── 5_desert_level.png
│   └── 6_leaderboard.png
└── fr-FR/
    ├── 1_forest_level.png
    ├── 2_conjugation_quiz.png
    ├── 3_hero_selection.png
    ├── 4_boss_battle.png
    ├── 5_desert_level.png
    └── 6_leaderboard.png
```

## Tips
- Take screenshots on a simulator at the correct device size
- The game auto-detects locale, so French screenshots will have French UI
- Use `xcrun simctl` to capture: `xcrun simctl io booted screenshot filename.png`
