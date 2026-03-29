import Foundation
import CoreGraphics

/// All data structures for a generated level, ported from JS.

// MARK: - Tile

struct Tile {
    let path: String
    var collision: TileCollision = .solid
    var groundSolid: Bool = false
    var oneWayPlatform: Bool = false
    var walkableTop: Bool = false
    var role: String? = nil
}

enum TileCollision: String {
    case solid
    case none
}

// MARK: - Platform

struct PlatformRail {
    let startX: Int
    let endX: Int
    let y: Int
    let themeId: String
    var isSecret: Bool = false
    var isOneWay: Bool = true
}

// MARK: - Moving Platform

struct MovingPlatform {
    let x: CGFloat
    let y: CGFloat
    let width: CGFloat
    let height: CGFloat = 16
    let axis: Axis
    let range: CGFloat
    let speed: CGFloat
    var phase: CGFloat = 0

    enum Axis { case horizontal, vertical }

    /// Current position offset from base.
    func currentOffset(time: CGFloat) -> CGFloat {
        sin((time + phase) * speed) * range
    }
}

// MARK: - Crumbling Platform

struct CrumblingPlatform {
    let x: CGFloat
    let y: CGFloat
    let width: CGFloat
    let height: CGFloat = 16
    let disappearDelay: CGFloat
    var triggered: Bool = false
    var triggerTime: CGFloat = 0
    var removed: Bool = false
}

// MARK: - Hole

struct GroundHole {
    let start: Int  // Tile column start
    let end: Int    // Tile column end (exclusive)
}

// MARK: - Segment (block in a level)

struct LevelSegment {
    let blockId: String
    let startX: Int
    let endX: Int
    let progress: CGFloat     // 0-1 position in level
    let difficulty: CGFloat   // 0-5
    let heightValue: CGFloat  // -1 to 1
}

// MARK: - Spawn Data

struct EnemySpawn {
    let enemyId: String
    let x: CGFloat
    let y: CGFloat
    let patrolMin: CGFloat
    let patrolMax: CGFloat
    let dir: CGFloat  // 1 or -1
}

struct AnimalSpawn {
    let animalId: String
    let x: CGFloat
    let y: CGFloat
    let patrolMin: CGFloat
    let patrolMax: CGFloat
}

struct GuardSpawn {
    let x: CGFloat
    let y: CGFloat
    let messages: [String]
}

// MARK: - Bonus Block

struct BonusBlock {
    let x: CGFloat
    let y: CGFloat
    let w: CGFloat
    let h: CGFloat
    var triggered: Bool = false
    var bumpOffset: CGFloat = 0
    var rewardType: String = "coin"
}

// MARK: - Conjugation Gate

struct ConjugationGate {
    let x: CGFloat
    let y: CGFloat
    let width: CGFloat
    let height: CGFloat
    var unlocked: Bool = false
}

// MARK: - Level

struct Level {
    let id: Int
    let seed: UInt32
    let biomeId: String
    let widthTiles: Int
    let heightTiles: Int
    let tileSize: CGFloat

    var worldWidth: CGFloat { CGFloat(widthTiles) * tileSize }
    var worldHeight: CGFloat { CGFloat(heightTiles) * tileSize }

    // Tile grid: tileGrid[row][col], nil = empty
    var tileGrid: [[Tile?]]

    // Ground
    var groundSurfaceY: CGFloat  // Y of ground surface (Y-down)
    var holes: [GroundHole] = []

    // Platforms
    var platformRails: [PlatformRail] = []
    var movingPlatforms: [MovingPlatform] = []
    var crumblingPlatforms: [CrumblingPlatform] = []

    // Entities
    var enemySpawns: [EnemySpawn] = []
    var animalSpawns: [AnimalSpawn] = []
    var guardSpawns: [GuardSpawn] = []

    // Objects
    var bonuses: [BonusBlock] = []
    var conjugationGates: [ConjugationGate] = []

    // Structures
    var startX: CGFloat = 0
    var startY: CGFloat = 0
    var endX: CGFloat = 0
    var endY: CGFloat = 0
    var endWidth: CGFloat = 64
    var endHeight: CGFloat = 128

    // Metadata
    var blockSequence: [String] = []
    var segments: [LevelSegment] = []
}

// MARK: - Biome Data

struct BiomeData {
    let id: String
    let displayName: String
    let backgroundTop: String   // Hex color
    let backgroundBottom: String
    let parallaxPath: String?
    let groundStyle: String
    let primaryEnemyId: String
    let animalIds: [String]
}

extension BiomeData {
    static let all: [String: BiomeData] = [
        "forest": BiomeData(
            id: "forest", displayName: "Forêt",
            backgroundTop: "#1e3f2b", backgroundBottom: "#437b4f",
            parallaxPath: "game_assets/backgrounds/forest-background.png",
            groundStyle: "forest", primaryEnemyId: "forest-wasp",
            animalIds: ["forest-goat", "forest-sheep", "forest-rabbit"]
        ),
        "desert": BiomeData(
            id: "desert", displayName: "Désert",
            backgroundTop: "#533922", backgroundBottom: "#a46e30",
            parallaxPath: "game_assets/backgrounds/desert-background.png",
            groundStyle: "desert", primaryEnemyId: "desert-scorpion",
            animalIds: ["desert-camel", "desert-fennec"]
        ),
        "mountain": BiomeData(
            id: "mountain", displayName: "Montagne",
            backgroundTop: "#2b3a4f", backgroundBottom: "#5b7793",
            parallaxPath: "game_assets/backgrounds/moutain-background.png",
            groundStyle: "mountain", primaryEnemyId: "mountain-snake",
            animalIds: ["mountain-marmot", "mountain-ibex"]
        ),
        "snow": BiomeData(
            id: "snow", displayName: "Neige",
            backgroundTop: "#3e5873", backgroundBottom: "#a1bfd8",
            parallaxPath: "game_assets/backgrounds/snow-background.png",
            groundStyle: "snow", primaryEnemyId: "snow-fox",
            animalIds: ["snow-reindeer", "snow-otter", "snow-rabbit"]
        ),
        "desolation": BiomeData(
            id: "desolation", displayName: "Désolation",
            backgroundTop: "#1f1d27", backgroundBottom: "#4a4458",
            parallaxPath: "game_assets/backgrounds/desolation-background.png",
            groundStyle: "desolation", primaryEnemyId: "desolation-wolf",
            animalIds: ["desolation-frog", "desolation-earthworm"]
        ),
    ]
}
