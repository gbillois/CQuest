import Foundation
import CoreGraphics

// MARK: - Virtual Canvas (matches HTML exactly)
enum GameConstants {
    static let virtualWidth: CGFloat = 432
    static let virtualHeight: CGFloat = 768

    // MARK: - Core Physics
    static let gravity: CGFloat = 1380
    static let moveSpeed: CGFloat = 188
    static let jumpVelocity: CGFloat = -525
    static let maxFallVelocity: CGFloat = 810
    static let friction: CGFloat = 0.84
    static let levelCount = 5

    // MARK: - Scaling
    static let baseUnit: CGFloat = 64
    static let heroScale: CGFloat = 1.5
    static let enemyScale: CGFloat = 1.5
    static let worldScale: CGFloat = 1
    static let towerHeightScale: CGFloat = 1.5
    static let castleScale: CGFloat = 1.5

    // MARK: - Player
    static let defaultStartingHearts = 3
    static let maxHearts = 5
    static let playerHitboxWidth: CGFloat = 28
    static let playerHitboxHeight: CGFloat = 120
    static let jumpCutMultiplier: CGFloat = 0.4
    static let jumpBufferWindowSeconds: CGFloat = 0.1
    static let coyoteTimeSeconds: CGFloat = 0.08
    static let cameraDeadzoneX: CGFloat = 20
    static let cameraLerpSpeed: CGFloat = 5
    static let playerHitInvulnSeconds: CGFloat = 1.6
    static let playerHitStunSeconds: CGFloat = 0.18
    static let playerHitKnockbackX: CGFloat = 190
    static let playerHitKnockbackY: CGFloat = -320
    static let playerHitBlinkHz: CGFloat = 14
    static let playerDeathDelaySeconds: CGFloat = 1
    static let playerDeathLaunchY: CGFloat = -420

    // MARK: - Enemy
    static let enemyMoveSpeed: CGFloat = 52
    static let enemyHitboxWidthRatio: CGFloat = 0.34
    static let enemyHitboxHeightRatio: CGFloat = 0.62
    static let enemyMinHitboxW: CGFloat = 28
    static let enemyMaxHitboxW: CGFloat = 56
    static let enemyMinHitboxH: CGFloat = 56
    static let enemyMaxHitboxH: CGFloat = 104
    static let animalMinHitboxW: CGFloat = 20
    static let animalMaxHitboxW: CGFloat = 72
    static let animalMinHitboxH: CGFloat = 18
    static let animalMaxHitboxH: CGFloat = 72
    static let enemyDefeatFadeSeconds: CGFloat = 0.75
    static let enemyDefeatRisePx: CGFloat = 10
    static let enemyDropGravity: CGFloat = 1450
    static let enemyDropMaxFallSpeed: CGFloat = 760
    static let enemyDropSizeRatio: CGFloat = 0.68
    static let animalBounceVelocity: CGFloat = -520

    // MARK: - Bonus / Popup
    static let bonusPopupGravity: CGFloat = 1250
    static let bonusPopupMaxFallSpeed: CGFloat = 640
    static let bonusMinSupportGapTiles = 2
    static let bonusMaxSupportGapTiles = 5

    // MARK: - Ground / Tiles
    static let groundThicknessTiles = 4
    static let groundTileOverlapPx: CGFloat = 20
    static let groundTileHorizontalOverlapPx: CGFloat = 2
    static let groundSurfaceVariationMaxUp = 1
    static let groundSurfaceVariationMaxDown = 1

    // MARK: - Guards
    static let guardTriggerRadius: CGFloat = 200
    static let guardScale: CGFloat = 1.5
    static let guardMessageTTL: CGFloat = 4.0

    // MARK: - Boss
    static let bossTrialsRequired = 5
    static let bossTrialTimeLimitSeconds: CGFloat = 10
    static let bossCelebrationSeconds: CGFloat = 6
    static let bossDefeatOverlaySeconds: CGFloat = 2.2
    static let bossIntroMessageDelaySeconds: CGFloat = 2.6

    // MARK: - Projectiles
    static let mageFireballSpeed: CGFloat = 420
    static let mageFireballRadius: CGFloat = 16
    static let ninjaShurkenSpeed: CGFloat = 520
    static let ninjaShurikenRadius: CGFloat = 12
    static let pirateSaberSpeedX: CGFloat = 300
    static let pirateSaberSpeedY: CGFloat = -260
    static let pirateSaberGravity: CGFloat = 720
    static let pirateSaberRadius: CGFloat = 14
    static let barbarianAxeSpeed: CGFloat = 430
    static let barbarianAxeRadius: CGFloat = 13
    static let golemRockSpeedX: CGFloat = 290
    static let golemRockSpeedY: CGFloat = -205
    static let golemRockGravity: CGFloat = 760
    static let golemRockRadius: CGFloat = 18
    static let knightFireballSpeed: CGFloat = 470
    static let knightFireballRadius: CGFloat = 17

    // MARK: - Generation Profiles
    static let profileStartingHearts: [String: Int] = [
        "easy": 5,
        "normal": 5,
        "chaotic": 3,
    ]

    static func startingHearts(for profile: String) -> Int {
        profileStartingHearts[profile] ?? defaultStartingHearts
    }

    // MARK: - Delta Time
    static let maxDeltaTime: CGFloat = 0.033  // Cap at ~30fps

    // MARK: - Tenses
    static let tenseKeys = ["pr", "pc", "im", "fu", "co"]
    static let tenseLabels: [String: String] = [
        "pr": "Présent",
        "pc": "Passé composé",
        "im": "Imparfait",
        "fu": "Futur",
        "co": "Conditionnel présent",
    ]
    static let pronounLabels = ["je", "tu", "il/elle", "nous", "vous", "ils/elles"]

    // MARK: - Biome Order
    static let fixedLevelBiomeOrder = ["forest", "desert", "mountain", "snow", "desolation"]

    // MARK: - Biome Backgrounds (gradient colors)
    static let biomeBackgroundColors: [String: (top: String, bottom: String)] = [
        "castle": ("#1d2235", "#2f3b57"),
        "desert": ("#533922", "#a46e30"),
        "desolation": ("#1f1d27", "#4a4458"),
        "forest": ("#1e3f2b", "#437b4f"),
        "mountain": ("#2b3a4f", "#5b7793"),
        "snow": ("#3e5873", "#a1bfd8"),
        "wood": ("#3b2a1d", "#7b5a39"),
    ]

    // MARK: - Biome Parallax Backgrounds
    static let biomeParallaxBackgrounds: [String: String] = [
        "desert": "game_assets/backgrounds/desert-background.png",
        "desolation": "game_assets/backgrounds/desolation-background.png",
        "forest": "game_assets/backgrounds/forest-background.png",
        "mountain": "game_assets/backgrounds/moutain-background.png",
        "snow": "game_assets/backgrounds/snow-background.png",
        "castle": "game_assets/backgrounds/desolation-background.png",
        "wood": "game_assets/backgrounds/forest-background.png",
    ]

    // MARK: - Biome Enemies
    static let biomeEnemyIds: [String: String] = [
        "forest": "forest-wasp",
        "desert": "desert-scorpion",
        "mountain": "mountain-snake",
        "snow": "snow-fox",
        "desolation": "desolation-wolf",
    ]

    // MARK: - Biome Animals
    static let biomeAnimalIds: [String: [String]] = [
        "forest": ["forest-goat", "forest-sheep", "forest-rabbit"],
        "desert": ["desert-camel", "desert-fennec"],
        "mountain": ["mountain-marmot", "mountain-ibex"],
        "snow": ["snow-reindeer", "snow-otter", "snow-rabbit"],
        "desolation": ["desolation-frog", "desolation-earthworm"],
    ]

    // MARK: - Ground Tile Files
    static let groundTileFilesByStyle: [String: [String]] = [
        "desert": [
            "newsand_tile_r01_c01.png", "newsand_tile_r02_c01.png",
            "newsand_tile_r02_c03.png", "newsand_tile_r03_c01.png",
            "newsand_tile_r03_c03.png", "newsand_tile_r03_c04.png",
            "newsand_tile_r04_c01.png",
        ],
        "desolation": [
            "newdeso_tile_r01_c01.png", "newdeso_tile_r02_c02.png",
            "newdeso_tile_r03_c01.png", "newdeso_tile_r03_c03.png",
            "newdeso_tile_r03_c04.png", "newdeso_tile_r04_c01.png",
        ],
        "forest": [
            "newgrass_tile_r01_c01.png", "newgrass_tile_r01_c02.png",
            "newgrass_tile_r01_c03.png", "newgrass_tile_r01_c04.png",
            "newgrass_tile_r02_c01.png", "newgrass_tile_r02_c02.png",
            "newground_tile_r01_c01.png", "newground_tile_r02_c01.png",
            "newground_tile_r03_c01.png", "newground_tile_r03_c04.png",
            "newground_tile_r04_c01.png",
        ],
        "mountain": [
            "newrock_tile_r02_c02.png", "newrock_tile_r02_c03.png",
            "newrock_tile_r02_c04.png", "newrock_tile_r03_c01.png",
            "newrock_tile_r03_c02.png", "newrock_tile_r03_c03.png",
            "newrock_tile_r03_c04.png", "newrock_tile_r04_c01.png",
            "newrock_tile_r04_c02.png",
        ],
        "snow": [
            "newsnow_tile_r01_c01.png", "newsnow_tile_r02_c01.png",
            "newsnow_tile_r02_c02.png", "newsnow_tile_r03_c01.png",
            "newsnow_tile_r03_c03.png", "newsnow_tile_r04_c01.png",
        ],
    ]

    // MARK: - Ground Decor Files
    static let groundDecorFilesByStyle: [String: [String]] = [
        "desert": ["decosand1.png", "decosand2.png", "decosand3.png", "decosand4.png"],
        "desolation": ["desolationdeco1.png", "desolationdeco2.png", "desolationdeco3.png", "desolationdeco4.png"],
        "forest": ["grassdeco01.png", "grassdeco02.png", "grassdeco03.png", "grassdeco04.png"],
        "mountain": ["moutaindeco01.png", "moutaindeco02.png", "moutaindeco03.png", "moutaindeco04.png"],
        "snow": ["snowdeco01.png", "snowdeco02.png", "snowdeco03.png", "snowdeco04.png"],
    ]

    // MARK: - Ground Tile Style by Biome
    static let groundTileStyleByBiome: [String: String] = [
        "desert": "desert",
        "desolation": "desolation",
        "forest": "forest",
        "mountain": "mountain",
        "snow": "snow",
    ]

    // MARK: - Hero Shop Config
    struct HeroShopEntry {
        let price: Int
        let order: Int
        let defaultOwned: Bool
    }

    static let heroShopConfig: [String: HeroShopEntry] = [
        "paladin": HeroShopEntry(price: 0, order: 0, defaultOwned: true),
        "ninja": HeroShopEntry(price: 1120, order: 1, defaultOwned: false),
        "pirate": HeroShopEntry(price: 1600, order: 2, defaultOwned: false),
        "mage": HeroShopEntry(price: 2800, order: 3, defaultOwned: false),
        "barbarian": HeroShopEntry(price: 4000, order: 4, defaultOwned: false),
        "catwarrior": HeroShopEntry(price: 5600, order: 5, defaultOwned: false),
        "golem": HeroShopEntry(price: 7600, order: 6, defaultOwned: false),
        "knight": HeroShopEntry(price: 10000, order: 7, defaultOwned: false),
    ]

    // MARK: - Hero Hitbox Overrides
    static let heroHitboxOverrides: [String: (w: CGFloat?, h: CGFloat?)] = [
        "paladin": (w: 28, h: nil),
        "ninja": (w: 28, h: nil),
        "pirate": (w: 28, h: nil),
        "mage": (w: 28, h: nil),
        "barbarian": (w: 28, h: 68),
        "catwarrior": (w: 28, h: 60),
        "golem": (w: 56, h: 72),
        "knight": (w: 28, h: 65),
    ]

    // MARK: - Known Hero/Enemy/Animal Dirs
    static let knownHeroDirs = ["mage", "ninja", "paladin", "pirate", "Barbarian", "CatWarrior", "Golem", "Knight"]
    static let knownEnemyDirs = [
        "desert-mummy", "desert-scorpion", "desolation-skeleton", "desolation-wraith",
        "forest-goblin-green", "forest-sprite", "forest-wasp", "mountain-dwarf", "mountain-troll",
        "mountain-snake", "snow-yeti", "snow-zombie", "snow-fox", "desolation-wolf",
    ]
    static let knownAnimalDirs = [
        "forest-goat", "forest-sheep", "forest-rabbit",
        "desert-camel", "desert-fennec",
        "mountain-marmot", "mountain-ibex",
        "snow-reindeer", "snow-otter", "snow-rabbit",
        "desolation-frog", "desolation-earthworm",
    ]

    // MARK: - Generation Profiles
    struct GenerationProfile {
        let allowGroundHoles: Bool
        let patternLoop: [String]
        let maxHoleWidth: Int
        let holeBase: Int
        let holeMin: Int
        let holeMax: Int
        let enemyBase: Int
        let enemyPerLevel: Int
        let enemyMin: Int
        let enemyMax: Int
        let doubleSpawnLaneLength: Int
    }

    static let generationProfiles: [String: GenerationProfile] = [
        "easy": GenerationProfile(
            allowGroundHoles: false,
            patternLoop: ["intro", "run", "run", "hop", "run", "stairs", "run", "intro", "run"],
            maxHoleWidth: 1, holeBase: 2, holeMin: 2, holeMax: 5,
            enemyBase: 3, enemyPerLevel: 1, enemyMin: 4, enemyMax: 8, doubleSpawnLaneLength: 16
        ),
        "normal": GenerationProfile(
            allowGroundHoles: true,
            patternLoop: ["intro", "run", "hop", "air", "gauntlet", "air", "stairs", "hop", "air", "run", "gauntlet"],
            maxHoleWidth: 2, holeBase: 5, holeMin: 5, holeMax: 10,
            enemyBase: 4, enemyPerLevel: 2, enemyMin: 5, enemyMax: 12, doubleSpawnLaneLength: 12
        ),
        "chaotic": GenerationProfile(
            allowGroundHoles: true,
            patternLoop: ["intro", "air", "gauntlet", "hop", "air", "stairs", "gauntlet", "air", "hop", "finale"],
            maxHoleWidth: 3, holeBase: 7, holeMin: 7, holeMax: 14,
            enemyBase: 6, enemyPerLevel: 2, enemyMin: 7, enemyMax: 15, doubleSpawnLaneLength: 10
        ),
    ]

    static func generationProfile(for id: String) -> GenerationProfile {
        generationProfiles[id] ?? generationProfiles["normal"]!
    }
}
