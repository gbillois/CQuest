import Foundation
import CoreGraphics

/// Procedural level generator — ported from src/level-generator.js.
/// Generates levels with ground variation, holes, platforms, enemy/animal spawns.
enum LevelGenerator {

    // MARK: - Generate All Levels

    static func generateLevels(
        count: Int = GameConstants.levelCount,
        profile: String = "normal",
        baseSeed: UInt32? = nil
    ) -> [Level] {
        let seed = baseSeed ?? SeededRandom.createRunSeed()
        let biomes = GameConstants.fixedLevelBiomeOrder
        let genProfile = GameConstants.generationProfile(for: profile)

        var levels: [Level] = []
        for i in 0..<count {
            let levelSeed = seed &+ UInt32(i) &* 101
            let biomeId = biomes[i % biomes.count]
            // Match JS: clamp(baseSize.width * 1.05 + i * 14, 120, 230)
            let rawWidth = Int(Double(128) * 1.05) + i * 14
            let widthTiles = max(120, min(rawWidth, 230))
            let level = generateLevel(
                index: i,
                seed: levelSeed,
                biomeId: biomeId,
                widthTiles: widthTiles,
                heightTiles: 36,
                profile: genProfile
            )
            levels.append(level)
        }
        return levels
    }

    // MARK: - Generate Single Level

    static func generateLevel(
        index: Int,
        seed: UInt32,
        biomeId: String,
        widthTiles: Int,
        heightTiles: Int,
        profile: GameConstants.GenerationProfile
    ) -> Level {
        var rand = SeededRandom(seed: seed)
        let tileSize: CGFloat = 64

        // Initialize empty tile grid
        let emptyRow = [Tile?](repeating: nil, count: widthTiles)
        var tileGrid = [[Tile?]](repeating: emptyRow, count: heightTiles)

        // Ground surface: 4 tiles from the bottom of the visible area
        let groundRow = heightTiles - GameConstants.groundThicknessTiles  // row 32 of 36
        let groundSurfaceY = CGFloat(groundRow) * tileSize

        // Reserved ranges: start area [0,15], end area [widthTiles-15, widthTiles]
        let startReserve = 15
        let endReserve = widthTiles - 15

        // --- Phase 1: Fill ground ---
        let groundStyle = GameConstants.groundTileStyleByBiome[biomeId] ?? "forest"
        let groundFiles = GameConstants.groundTileFilesByStyle[groundStyle] ?? []

        for col in 0..<widthTiles {
            for row in 0..<GameConstants.groundThicknessTiles {
                let tileRow = groundRow + row
                guard tileRow < heightTiles else { continue }
                let fileIdx = (col + row * 7) % max(1, groundFiles.count)
                let path = groundFiles.isEmpty
                    ? "fallback_ground.png"
                    : "game_assets/ground/\(groundStyle)/\(groundFiles[fileIdx])"
                tileGrid[tileRow][col] = Tile(
                    path: path,
                    collision: .solid,
                    groundSolid: true
                )
            }
        }

        // --- Phase 2: Ground Holes ---
        var holes: [GroundHole] = []
        if profile.allowGroundHoles {
            let targetHoles = rand.nextInt(min: profile.holeMin, max: profile.holeMax)
            var placed = 0
            var attempts = 0
            while placed < targetHoles && attempts < 200 {
                attempts += 1
                let holeStart = rand.nextInt(min: startReserve + 4, max: endReserve - 4)
                let holeWidth = rand.nextInt(min: 1, max: profile.maxHoleWidth)
                let holeEnd = min(holeStart + holeWidth, endReserve - 2)

                // Check minimum spacing from existing holes
                let tooClose = holes.contains { abs($0.start - holeStart) < 5 || abs($0.end - holeStart) < 5 }
                if tooClose { continue }

                // Clear ground tiles in hole
                for col in holeStart..<holeEnd {
                    for row in 0..<GameConstants.groundThicknessTiles {
                        let tileRow = groundRow + row
                        if tileRow < heightTiles {
                            tileGrid[tileRow][col] = nil
                        }
                    }
                }
                holes.append(GroundHole(start: holeStart, end: holeEnd))
                placed += 1
            }
        }

        // --- Phase 3: Platforms ---
        var platformRails: [PlatformRail] = []
        let patternLoop = profile.patternLoop
        let segmentCount = max(5, widthTiles / 12)
        let segmentWidth = (endReserve - startReserve) / segmentCount

        var segments: [LevelSegment] = []
        for i in 0..<segmentCount {
            let pattern = patternLoop[i % patternLoop.count]
            let startX = startReserve + i * segmentWidth
            let endX = min(startX + segmentWidth, endReserve)
            let progress = CGFloat(i) / CGFloat(segmentCount)
            let difficulty = progress * 5.0

            segments.append(LevelSegment(
                blockId: pattern,
                startX: startX, endX: endX,
                progress: progress, difficulty: difficulty,
                heightValue: 0
            ))

            // Generate platforms based on pattern
            let platforms = generatePatternPlatforms(
                pattern: pattern,
                startX: startX,
                endX: endX,
                groundRow: groundRow,
                difficulty: difficulty,
                rand: &rand,
                widthTiles: widthTiles
            )

            for p in platforms {
                // Validate platform Y is reachable
                let maxJumpTiles = 5  // ~5 tiles jump height
                let minY = groundRow - maxJumpTiles
                let clampedY = max(minY, min(p.y, groundRow - 2))

                platformRails.append(PlatformRail(
                    startX: p.startX, endX: p.endX,
                    y: clampedY, themeId: biomeId
                ))

                // Place one-way platform tiles
                for col in p.startX..<p.endX {
                    guard col >= 0, col < widthTiles, clampedY >= 0, clampedY < heightTiles else { continue }
                    tileGrid[clampedY][col] = Tile(
                        path: "game_assets/platforms/wood/woodhalf_tile_r01_c02_01.png",
                        collision: .solid,
                        oneWayPlatform: true,
                        walkableTop: true,
                        role: "platform_surface"
                    )
                }
            }
        }

        // --- Phase 4: Enemy Spawns ---
        let enemyCount = min(
            profile.enemyMax,
            max(profile.enemyMin, profile.enemyBase + index * profile.enemyPerLevel)
        )
        var enemySpawns: [EnemySpawn] = []
        let enemyId = GameConstants.biomeEnemyIds[biomeId] ?? "forest-wasp"

        for i in 0..<enemyCount {
            // Distribute enemies across the level
            let progress = CGFloat(i + 1) / CGFloat(enemyCount + 1)
            let col = startReserve + Int(progress * CGFloat(endReserve - startReserve))
            let x = CGFloat(col) * tileSize
            let y = groundSurfaceY - 64  // On ground surface

            // Patrol range: ±3-6 tiles from spawn
            let patrolRange = CGFloat(rand.nextInt(min: 3, max: 6)) * tileSize
            let patrolMin = max(0, x - patrolRange)
            let patrolMax = min(CGFloat(widthTiles) * tileSize, x + patrolRange)

            enemySpawns.append(EnemySpawn(
                enemyId: enemyId,
                x: x, y: y,
                patrolMin: patrolMin, patrolMax: patrolMax,
                dir: rand.next() > 0.5 ? 1 : -1
            ))
        }

        // --- Phase 5: Animal Spawns ---
        var animalSpawns: [AnimalSpawn] = []
        let animalIds = GameConstants.biomeAnimalIds[biomeId] ?? []
        if !animalIds.isEmpty {
            let animalCount = rand.nextInt(min: 2, max: 4)
            for i in 0..<animalCount {
                let progress = CGFloat(i + 1) / CGFloat(animalCount + 2)
                let col = startReserve + Int(progress * CGFloat(endReserve - startReserve))
                let x = CGFloat(col) * tileSize
                let y = groundSurfaceY - 48
                let patrolRange = CGFloat(rand.nextInt(min: 2, max: 4)) * tileSize

                animalSpawns.append(AnimalSpawn(
                    animalId: rand.pick(from: animalIds) ?? animalIds[0],
                    x: x, y: y,
                    patrolMin: max(0, x - patrolRange),
                    patrolMax: min(CGFloat(widthTiles) * tileSize, x + patrolRange)
                ))
            }
        }

        // --- Phase 5b: Bonus Blocks ---
        var bonuses: [BonusBlock] = []
        let bonusDensity = 8  // per 100 tiles
        let bonusCount = max(3, widthTiles * bonusDensity / 100)
        let rewardTypes = ["coin", "coin", "coin", "jewel", "jewel", "potion", "helmet", "flail"]
        for i in 0..<bonusCount {
            let progress = CGFloat(i + 1) / CGFloat(bonusCount + 1)
            let col = startReserve + Int(progress * CGFloat(endReserve - startReserve))
            let bonusRow = groundRow - rand.nextInt(min: 3, max: 5)
            guard col >= 0, col < widthTiles, bonusRow >= 2, bonusRow < heightTiles else { continue }
            let reward = rand.pick(from: rewardTypes) ?? "coin"
            bonuses.append(BonusBlock(
                x: CGFloat(col) * tileSize,
                y: CGFloat(bonusRow) * tileSize,
                w: tileSize,
                h: tileSize,
                rewardType: reward
            ))
        }

        // --- Phase 6: Start/End positions ---
        let startX = tileSize * 3
        let startY = groundSurfaceY - 120  // Player height above ground
        let endX = CGFloat(widthTiles - 5) * tileSize
        let endY = groundSurfaceY - 128

        // --- Build level ---
        var level = Level(
            id: index,
            seed: seed,
            biomeId: biomeId,
            widthTiles: widthTiles,
            heightTiles: heightTiles,
            tileSize: tileSize,
            tileGrid: tileGrid,
            groundSurfaceY: groundSurfaceY
        )
        level.holes = holes
        level.platformRails = platformRails
        level.enemySpawns = enemySpawns
        level.animalSpawns = animalSpawns
        level.bonuses = bonuses
        level.blockSequence = segments.map { $0.blockId }
        level.segments = segments
        level.startX = startX
        level.startY = startY
        level.endX = endX
        level.endY = endY

        return level
    }

    // MARK: - Pattern Platform Generation

    private struct RawPlatform {
        let startX: Int
        let endX: Int
        let y: Int
    }

    private static func generatePatternPlatforms(
        pattern: String,
        startX: Int,
        endX: Int,
        groundRow: Int,
        difficulty: CGFloat,
        rand: inout SeededRandom,
        widthTiles: Int
    ) -> [RawPlatform] {
        let segWidth = endX - startX
        guard segWidth > 4 else { return [] }

        switch pattern {
        case "intro", "run":
            // Simple: 0-1 small platforms
            if rand.next() > 0.6 {
                let px = startX + rand.nextInt(min: 2, max: segWidth - 4)
                let pw = rand.nextInt(min: 3, max: 5)
                let py = groundRow - rand.nextInt(min: 3, max: 4)
                return [RawPlatform(startX: px, endX: min(px + pw, endX), y: py)]
            }
            return []

        case "hop":
            // 2-3 stepping stone platforms
            let count = rand.nextInt(min: 2, max: 3)
            var platforms: [RawPlatform] = []
            let spacing = segWidth / (count + 1)
            for i in 0..<count {
                let px = startX + (i + 1) * spacing
                let pw = rand.nextInt(min: 2, max: 4)
                let py = groundRow - rand.nextInt(min: 2, max: 4)
                platforms.append(RawPlatform(startX: px, endX: min(px + pw, endX), y: py))
            }
            return platforms

        case "air":
            // 3-5 elevated platforms
            let count = rand.nextInt(min: 3, max: 5)
            var platforms: [RawPlatform] = []
            let spacing = segWidth / (count + 1)
            for i in 0..<count {
                let px = startX + (i + 1) * spacing - 1
                let pw = rand.nextInt(min: 3, max: 5)
                let height = rand.nextInt(min: 3, max: 5)
                let py = groundRow - height
                platforms.append(RawPlatform(startX: px, endX: min(px + pw, endX), y: py))
            }
            return platforms

        case "gauntlet":
            // Dense: 4-6 platforms at varying heights
            let count = rand.nextInt(min: 4, max: 6)
            var platforms: [RawPlatform] = []
            let spacing = segWidth / (count + 1)
            for i in 0..<count {
                let px = startX + (i + 1) * spacing - 1
                let pw = rand.nextInt(min: 2, max: 3)
                let height = rand.nextInt(min: 2, max: 5)
                let py = groundRow - height
                platforms.append(RawPlatform(startX: px, endX: min(px + pw, endX), y: py))
            }
            return platforms

        case "stairs":
            // Ascending platforms
            let count = rand.nextInt(min: 3, max: 5)
            var platforms: [RawPlatform] = []
            for i in 0..<count {
                let px = startX + i * (segWidth / count)
                let pw = rand.nextInt(min: 2, max: 4)
                let py = groundRow - (i + 2)
                platforms.append(RawPlatform(startX: px, endX: min(px + pw, endX), y: py))
            }
            return platforms

        case "finale":
            // Dense, high difficulty
            let count = rand.nextInt(min: 4, max: 7)
            var platforms: [RawPlatform] = []
            for i in 0..<count {
                let px = startX + i * (segWidth / count)
                let pw = rand.nextInt(min: 2, max: 4)
                let height = rand.nextInt(min: 2, max: 5)
                let py = groundRow - height
                platforms.append(RawPlatform(startX: px, endX: min(px + pw, endX), y: py))
            }
            return platforms

        default:
            return []
        }
    }
}
