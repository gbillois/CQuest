import Foundation
import SpriteKit

/// Main game scene — owns all gameplay: physics, camera, entities, rendering.
/// Uses a 432x768 virtual canvas with .aspectFill scaling.
///
/// Coordinate system: Y-down internally (matching HTML game).
/// SpriteKit Y-up only used for final node positioning via worldToScene().
class GameScene: SKScene {

    // MARK: - View Model
    private var viewModel: GameViewModel?

    // MARK: - Camera
    private let cameraNode = SKCameraNode()
    private var gameCameraX: CGFloat = 0

    // MARK: - Levels
    private var levels: [Level] = []
    private var currentLevelIndex: Int = 0
    private var currentLevel: Level?

    // MARK: - Scene Layers
    private let backgroundNode = SKNode()
    private let groundNode = SKNode()
    private let platformNode = SKNode()
    private let entityNode = SKNode()

    // MARK: - Parallax
    private lazy var parallaxBg = ParallaxBackground(parentNode: backgroundNode)

    // MARK: - Collision Data (built from level)
    private var groundCollisionRects: [CGRect] = []
    private var platformCollisionRects: [CGRect] = []

    // MARK: - End Goal
    private var endGoalNode: SKSpriteNode?

    // MARK: - Enemies & Animals
    private var enemies: [EnemyNode] = []
    private var animals: [AnimalNode] = []
    private var duelEnemy: EnemyNode?

    // MARK: - Player
    private var player = PlayerNode()
    private var playerPreviousY: CGFloat = 0

    // MARK: - Game Config
    private var selectedHeroId: String = "paladin"
    private var difficultyMode: String = "normal"
    private var activeTenses: Set<String> = Set(GameConstants.tenseKeys)
    private var activeGroups: Set<String> = Set(ConjugationData.verbs.keys)

    // MARK: - Level Transition
    private var isTransitioning: Bool = false
    private let fadeNode = SKSpriteNode(color: .black, size: CGSize(width: 1000, height: 1000))

    // MARK: - Boss Fight
    private var bossActive: Bool = false
    private var bossTrialCount: Int = 0
    private var bossCorrectStreak: Int = 0
    private var bossNode: SKSpriteNode?

    // MARK: - Projectiles
    private struct Projectile {
        let node: SKSpriteNode
        var worldX: CGFloat
        var worldY: CGFloat
        var vx: CGFloat
        var vy: CGFloat
        var gravity: CGFloat
        var radius: CGFloat
    }
    private var projectiles: [Projectile] = []
    private var fireCooldown: CGFloat = 0

    // MARK: - Guards
    private var guardNodes: [(spawn: GuardSpawn, node: SKSpriteNode, labelNode: SKLabelNode?)] = []

    // MARK: - Sky Birds
    private var skyBirds: [(spawn: SkyBirdSpawn, node: SKSpriteNode)] = []

    // MARK: - Tower
    private var towerNode: SKSpriteNode?
    private var towerInteriorActive: Bool = false
    private var towerChestState: String = "locked"  // "locked", "open"
    private var towerChestStreak: Int = 0
    private let towerChestRequired: Int = 3

    // MARK: - Bonus Blocks
    private var bonusBlockNodes: [(block: BonusBlock, node: SKSpriteNode)] = []

    // MARK: - Status Message Throttle
    private var lastStatusTime: CGFloat = 0

    // MARK: - Timing
    private var lastUpdateTime: TimeInterval = 0
    private var runTime: CGFloat = 0

    // MARK: - Coordinate Conversion

    private func worldToScene(x: CGFloat, y: CGFloat) -> CGPoint {
        guard let level = currentLevel else {
            return CGPoint(x: x, y: -y)
        }
        return CGPoint(
            x: x - level.worldWidth / 2,
            y: GameConstants.virtualHeight / 2 - y
        )
    }

    private func worldToSceneFunc() -> (CGFloat, CGFloat) -> CGPoint {
        { [weak self] x, y in
            self?.worldToScene(x: x, y: y) ?? CGPoint(x: x, y: -y)
        }
    }

    // MARK: - Setup

    func bind(to viewModel: GameViewModel) {
        self.viewModel = viewModel
        viewModel.scene = self
    }

    func configure(
        heroId: String,
        difficulty: String,
        activeTenses: Set<String>,
        activeGroups: Set<String>
    ) {
        self.selectedHeroId = heroId
        self.difficultyMode = difficulty
        self.activeTenses = activeTenses
        self.activeGroups = activeGroups
    }

    override func didMove(to view: SKView) {
        backgroundColor = .black
        anchorPoint = CGPoint(x: 0.5, y: 0.5)

        addChild(cameraNode)
        camera = cameraNode

        backgroundNode.zPosition = -100
        addChild(backgroundNode)

        groundNode.zPosition = 0
        addChild(groundNode)

        platformNode.zPosition = 2
        addChild(platformNode)

        entityNode.zPosition = 10
        addChild(entityNode)

        entityNode.addChild(player)

        // Fade node for level transitions
        fadeNode.zPosition = 100
        fadeNode.alpha = 0
        cameraNode.addChild(fadeNode)

        // Set starting hearts based on difficulty
        Task { @MainActor in
            viewModel?.hearts = GameConstants.startingHearts(for: difficultyMode)
        }

        // Generate all levels with selected difficulty
        levels = LevelGenerator.generateLevels(profile: difficultyMode)
        loadLevel(index: 0)
    }

    // MARK: - Load Level

    func loadLevel(index: Int) {
        currentLevelIndex = index
        guard index < levels.count else { return }
        currentLevel = levels[index]
        guard let level = currentLevel else { return }

        // Clear visuals
        groundNode.removeAllChildren()
        platformNode.removeAllChildren()
        backgroundNode.removeAllChildren()
        endGoalNode?.removeFromParent()
        endGoalNode = nil
        parallaxBg.removeAll()

        // Clear entities
        enemies.forEach { $0.removeFromParent() }
        enemies.removeAll()
        animals.forEach { $0.removeFromParent() }
        animals.removeAll()
        bonusBlockNodes.forEach { $0.node.removeFromParent() }
        bonusBlockNodes.removeAll()
        coinDrops.forEach { $0.node.removeFromParent() }
        coinDrops.removeAll()
        guardNodes.forEach { $0.node.removeFromParent() }
        guardNodes.removeAll()
        skyBirds.forEach { $0.node.removeFromParent() }
        skyBirds.removeAll()
        towerNode?.removeFromParent()
        towerNode = nil
        towerInteriorActive = false
        towerChestState = "locked"
        towerChestStreak = 0
        deathSequenceActive = false
        duelEnemy = nil
        projectiles.forEach { $0.node.removeFromParent() }
        projectiles.removeAll()
        bossNode?.removeFromParent()
        bossNode = nil
        bossActive = false

        // Build collision data
        buildCollisionData(level: level)

        // Draw visuals
        drawBackground(level: level)
        drawParallax(level: level)
        drawGroundTiles(level: level)
        drawGroundDecor(level: level)
        drawPlatformTiles(level: level)
        drawTower(level: level)
        drawEndGoal(level: level)

        // Spawn entities
        spawnEnemies(level: level)
        spawnAnimals(level: level)
        spawnBonusBlocks(level: level)
        spawnGuards(level: level)
        spawnSkyBirds(level: level)

        // Spawn player
        spawnPlayer(level: level)

        // Snap camera
        gameCameraX = player.worldX
        updateCamera(delta: 1.0 / 60.0, snap: true)

        Task { @MainActor in
            viewModel?.currentBiome = level.biomeId
            viewModel?.currentLevelIndex = index
        }
    }

    // MARK: - Build Collision Data

    private func buildCollisionData(level: Level) {
        let holes = level.holes.map { (start: $0.start, end: $0.end) }

        groundCollisionRects = PhysicsSystem.buildGroundRects(
            groundSurfaceY: level.groundSurfaceY,
            tileSize: level.tileSize,
            worldWidthTiles: level.widthTiles,
            holes: holes
        )

        // Platform collision rects (one-way)
        platformCollisionRects = level.platformRails.map { rail in
            let x = CGFloat(rail.startX) * level.tileSize
            let y = CGFloat(rail.y) * level.tileSize
            let w = CGFloat(rail.endX - rail.startX) * level.tileSize
            return CGRect(x: x, y: y, width: w, height: level.tileSize * 0.5)
        }
    }

    // MARK: - Draw Background

    private func drawBackground(level: Level) {
        guard let biome = BiomeData.all[level.biomeId] else { return }
        let topColor = UIColor(hex: biome.backgroundTop)
        let bottomColor = UIColor(hex: biome.backgroundBottom)

        let gradientSize = CGSize(width: GameConstants.virtualWidth, height: GameConstants.virtualHeight)
        let renderer = UIGraphicsImageRenderer(size: gradientSize)
        let image = renderer.image { ctx in
            let colorSpace = CGColorSpaceCreateDeviceRGB()
            let colors = [topColor.cgColor, bottomColor.cgColor] as CFArray
            if let gradient = CGGradient(colorsSpace: colorSpace, colors: colors, locations: [0, 1]) {
                ctx.cgContext.drawLinearGradient(
                    gradient,
                    start: .zero,
                    end: CGPoint(x: 0, y: gradientSize.height),
                    options: []
                )
            }
        }

        let tex = SKTexture(image: image)
        tex.filteringMode = .nearest
        let tilesNeeded = Int(ceil(level.worldWidth / GameConstants.virtualWidth)) + 1
        for i in 0..<tilesNeeded {
            let bg = SKSpriteNode(texture: tex, size: gradientSize)
            bg.anchorPoint = CGPoint(x: 0, y: 1)
            bg.position = worldToScene(x: CGFloat(i) * GameConstants.virtualWidth, y: 0)
            bg.zPosition = -100
            backgroundNode.addChild(bg)
        }
    }

    private func drawParallax(level: Level) {
        parallaxBg.setup(
            biomeId: level.biomeId,
            worldWidth: level.worldWidth,
            worldToScene: worldToSceneFunc()
        )
    }

    // MARK: - Draw Ground Tiles

    private func drawGroundTiles(level: Level) {
        let holeSet = Set(level.holes.flatMap { $0.start..<$0.end })

        for row in 0..<level.heightTiles {
            for col in 0..<level.widthTiles {
                guard let tile = level.tileGrid[row][col],
                      tile.groundSolid,
                      !holeSet.contains(col) || row < (level.heightTiles - GameConstants.groundThicknessTiles)
                else { continue }

                if let tex = AssetManager.shared.texture(for: tile.path) {
                    let sprite = SKSpriteNode(texture: tex, size: CGSize(width: level.tileSize + 2, height: level.tileSize + 2))
                    sprite.anchorPoint = CGPoint(x: 0, y: 1)
                    sprite.position = worldToScene(x: CGFloat(col) * level.tileSize, y: CGFloat(row) * level.tileSize)
                    sprite.zPosition = 1
                    groundNode.addChild(sprite)
                } else {
                    // Fallback colored tile
                    let sprite = SKSpriteNode(color: UIColor(red: 0.3, green: 0.5, blue: 0.3, alpha: 1), size: CGSize(width: level.tileSize, height: level.tileSize))
                    sprite.anchorPoint = CGPoint(x: 0, y: 1)
                    sprite.position = worldToScene(x: CGFloat(col) * level.tileSize, y: CGFloat(row) * level.tileSize)
                    sprite.zPosition = 1
                    groundNode.addChild(sprite)
                }
            }
        }
    }

    // MARK: - Draw Ground Decorations

    private func drawGroundDecor(level: Level) {
        for decor in level.groundDecor {
            guard let tex = AssetManager.shared.texture(for: decor.path) else { continue }
            let sprite = SKSpriteNode(texture: tex, size: tex.size())
            sprite.anchorPoint = CGPoint(x: 0.5, y: 1)
            sprite.position = worldToScene(x: decor.x, y: decor.y)
            sprite.zPosition = 1.5  // Between ground and platforms
            groundNode.addChild(sprite)
        }
    }

    // MARK: - Draw Platform Tiles

    private func drawPlatformTiles(level: Level) {
        for rail in level.platformRails {
            for col in rail.startX..<rail.endX {
                guard col >= 0, col < level.widthTiles else { continue }
                // Use tile path from the grid if available, otherwise fallback
                let row = rail.y
                let texPath: String
                if row >= 0, row < level.heightTiles, col < level.widthTiles,
                   let tile = level.tileGrid[row][col], tile.oneWayPlatform {
                    texPath = tile.path
                } else {
                    texPath = "game_assets/platforms/wood/woodhalf_tile_r01_c02.png"
                }
                let tex = AssetManager.shared.texture(for: texPath)
                let sprite: SKSpriteNode
                if let tex = tex {
                    sprite = SKSpriteNode(texture: tex, size: CGSize(width: level.tileSize + 2, height: level.tileSize * 0.5))
                } else {
                    sprite = SKSpriteNode(color: .brown, size: CGSize(width: level.tileSize, height: level.tileSize * 0.5))
                }
                sprite.anchorPoint = CGPoint(x: 0, y: 1)
                sprite.position = worldToScene(x: CGFloat(col) * level.tileSize, y: CGFloat(rail.y) * level.tileSize)
                sprite.zPosition = 2
                platformNode.addChild(sprite)
            }
        }
    }

    // MARK: - Draw End Goal

    private func drawEndGoal(level: Level) {
        // Try to load actual castle sprite
        let castleTex = AssetManager.shared.texture(for: "game_assets/castle/castle_unlocked.png")
        let goalSize: CGSize
        let goal: SKSpriteNode

        if let tex = castleTex {
            let scale = GameConstants.castleScale
            goalSize = CGSize(width: tex.size().width * scale, height: tex.size().height * scale)
            goal = SKSpriteNode(texture: tex, size: goalSize)
        } else {
            goalSize = CGSize(width: level.endWidth, height: level.endHeight)
            goal = SKSpriteNode(color: .yellow.withAlphaComponent(0.6), size: goalSize)
        }

        goal.anchorPoint = CGPoint(x: 0.5, y: 1)
        goal.position = worldToScene(x: level.endX + level.endWidth / 2, y: level.endY)
        goal.zPosition = 5

        entityNode.addChild(goal)
        endGoalNode = goal
    }

    // MARK: - Player Spawn

    private func spawnPlayer(level: Level) {
        player.loadHero(id: selectedHeroId)
        player.worldX = level.startX
        player.worldY = level.groundSurfaceY - player.hitboxHeight
        player.vx = 0
        player.vy = 0
        player.onGround = true
        player.isDead = false
        player.invulnTimeLeft = 0
        player.stunTimeLeft = 0
        playerPreviousY = player.worldY
        updatePlayerSpritePosition()
    }

    private func updatePlayerSpritePosition() {
        let centerX = player.worldX + player.hitboxWidth / 2
        let feetY = player.worldY + player.hitboxHeight
        // Position sprite so its feet align with hitbox bottom
        let scenePos = worldToScene(x: centerX, y: feetY - player.spriteDrawSize.height / 2)
        player.position = scenePos
    }

    // MARK: - Spawn Enemies

    private func spawnEnemies(level: Level) {
        for spawn in level.enemySpawns {
            let enemy = EnemyNode(enemyId: spawn.enemyId, spawn: spawn)
            entityNode.addChild(enemy)
            enemies.append(enemy)
        }
    }

    // MARK: - Spawn Animals

    private func spawnAnimals(level: Level) {
        for spawn in level.animalSpawns {
            let animal = AnimalNode(animalId: spawn.animalId, spawn: spawn)
            entityNode.addChild(animal)
            animals.append(animal)
        }
    }

    // MARK: - Draw Tower

    private func drawTower(level: Level) {
        guard let tower = level.tower else { return }
        let towerTex = AssetManager.shared.texture(for: "game_assets/tower/tower_main.png")
        let tNode: SKSpriteNode
        if let tex = towerTex {
            tNode = SKSpriteNode(texture: tex, size: CGSize(width: tower.width, height: tower.height))
        } else {
            tNode = SKSpriteNode(color: .brown.withAlphaComponent(0.7), size: CGSize(width: tower.width, height: tower.height))
        }
        tNode.anchorPoint = CGPoint(x: 0.5, y: 1)
        tNode.position = worldToScene(x: tower.x, y: tower.y)
        tNode.zPosition = 3
        entityNode.addChild(tNode)
        towerNode = tNode
    }

    // MARK: - Spawn Guards

    private func spawnGuards(level: Level) {
        for spawn in level.guardSpawns {
            // Guard body
            let guardTex = AssetManager.shared.texture(for: "game_assets/heroes/paladin/rotations/south-west.png")
            let node: SKSpriteNode
            if let tex = guardTex {
                let scale = GameConstants.guardScale
                node = SKSpriteNode(texture: tex, size: CGSize(width: tex.size().width * scale, height: tex.size().height * scale))
            } else {
                node = SKSpriteNode(color: .gray, size: CGSize(width: 40, height: 100))
            }
            node.position = worldToScene(x: spawn.x + 20, y: spawn.y + 50)
            node.zPosition = 6
            entityNode.addChild(node)
            guardNodes.append((spawn: spawn, node: node, labelNode: nil))
        }
    }

    // MARK: - Spawn Sky Birds

    private func spawnSkyBirds(level: Level) {
        for spawn in level.skyBirdSpawns {
            let bird = SKSpriteNode(color: .darkGray, size: CGSize(width: 12, height: 6))
            bird.zPosition = -40
            entityNode.addChild(bird)
            skyBirds.append((spawn: spawn, node: bird))
        }
    }

    // MARK: - Update Guards

    private func updateGuards() {
        guard !player.isDead else { return }

        let playerCenterX = player.worldX + player.hitboxWidth / 2

        for i in guardNodes.indices {
            let spawn = guardNodes[i].spawn
            let guardCenterX = spawn.x + 20
            let dist = abs(playerCenterX - guardCenterX)

            if dist < GameConstants.guardTriggerRadius {
                // Show dialog if not already showing
                if guardNodes[i].labelNode == nil, let msg = spawn.messages.first {
                    let label = SKLabelNode(text: msg)
                    label.fontName = "Helvetica-Bold"
                    label.fontSize = 12
                    label.fontColor = .white
                    label.numberOfLines = 0
                    label.preferredMaxLayoutWidth = 150
                    let pos = worldToScene(x: spawn.x + 20, y: spawn.y - 16)
                    label.position = pos
                    label.zPosition = 50

                    let bg = SKShapeNode(rectOf: CGSize(width: 160, height: 30), cornerRadius: 6)
                    bg.fillColor = UIColor(white: 0, alpha: 0.7)
                    bg.strokeColor = .clear
                    bg.zPosition = -1
                    label.addChild(bg)

                    entityNode.addChild(label)
                    guardNodes[i].labelNode = label

                    // Auto-remove after TTL
                    label.run(SKAction.sequence([
                        SKAction.wait(forDuration: TimeInterval(GameConstants.guardMessageTTL)),
                        SKAction.fadeOut(withDuration: 0.3),
                        SKAction.removeFromParent()
                    ])) { [weak self] in
                        if i < self?.guardNodes.count ?? 0 {
                            self?.guardNodes[i].labelNode = nil
                        }
                    }
                }
            }
        }
    }

    // MARK: - Update Crumbling Platforms

    private var crumblingPlatformNodes: [(platform: CrumblingPlatform, nodes: [SKSpriteNode])] = []

    private func updateCrumblingPlatforms(delta: CGFloat) {
        guard var level = currentLevel else { return }

        for i in level.crumblingPlatforms.indices {
            guard !level.crumblingPlatforms[i].removed else { continue }

            if !level.crumblingPlatforms[i].triggered {
                // Check if player is standing on this platform
                let plat = level.crumblingPlatforms[i]
                let platX = plat.x
                let platY = plat.y
                let platW = plat.width
                let playerFeetY = player.worldY + player.hitboxHeight
                let playerCenterX = player.worldX + player.hitboxWidth / 2
                let tolerance = level.tileSize * 0.25

                if player.onGround &&
                   abs(playerFeetY - platY) < tolerance &&
                   playerCenterX >= platX &&
                   playerCenterX <= platX + platW {
                    level.crumblingPlatforms[i].triggered = true
                    level.crumblingPlatforms[i].triggerTime = level.crumblingPlatforms[i].disappearDelay
                }
                continue
            }

            // Count down
            level.crumblingPlatforms[i].triggerTime -= delta

            if level.crumblingPlatforms[i].triggerTime <= 0 {
                level.crumblingPlatforms[i].removed = true
                // Remove from collision rects would go here in a full implementation
            }
        }

        currentLevel = level
    }

    // MARK: - Update Moving Platforms

    private func updateMovingPlatforms(delta: CGFloat) {
        guard var level = currentLevel else { return }

        for i in level.movingPlatforms.indices {
            level.movingPlatforms[i].phase += delta

            let plat = level.movingPlatforms[i]
            let t = plat.phase

            // Calculate new position
            var newX = plat.x
            var newY = plat.y

            switch plat.axis {
            case .horizontal:
                newX = plat.x + sin(t * plat.speed / 30) * plat.range
            case .vertical:
                newY = plat.y + sin(t * plat.speed / 30) * plat.range
            }

            // Check if player is riding
            let playerFeetY = player.worldY + player.hitboxHeight
            let playerCenterX = player.worldX + player.hitboxWidth / 2
            let tolerance = level.tileSize * 0.25

            if player.onGround &&
               abs(playerFeetY - newY) < tolerance &&
               playerCenterX >= newX &&
               playerCenterX <= newX + plat.width {
                let dx = newX - plat.x
                let dy = newY - plat.y
                player.worldX += dx
                player.worldY += dy
            }
        }

        currentLevel = level
    }

    // MARK: - Update Sky Birds

    private func updateSkyBirds(delta: CGFloat) {
        guard let level = currentLevel else { return }

        for i in skyBirds.indices {
            skyBirds[i].spawn.animTime += delta
            skyBirds[i].spawn.x += skyBirds[i].spawn.dir * skyBirds[i].spawn.speed * delta

            // Swoop (sine wave vertical motion)
            let t = skyBirds[i].spawn.animTime
            let swoopY = skyBirds[i].spawn.baseY + skyBirds[i].spawn.swoopAmp * sin(t * skyBirds[i].spawn.swoopFreq * .pi * 2 + skyBirds[i].spawn.swoopPhase)
            skyBirds[i].spawn.y = swoopY

            // Wrap around world edges
            if skyBirds[i].spawn.x < -50 { skyBirds[i].spawn.x = level.worldWidth + 50 }
            if skyBirds[i].spawn.x > level.worldWidth + 50 { skyBirds[i].spawn.x = -50 }

            // Flip based on direction
            skyBirds[i].node.xScale = skyBirds[i].spawn.dir >= 0 ? 1 : -1

            let pos = worldToScene(x: skyBirds[i].spawn.x, y: skyBirds[i].spawn.y)
            skyBirds[i].node.position = pos
        }
    }

    // MARK: - Spawn Bonus Blocks

    private func spawnBonusBlocks(level: Level) {
        for bonus in level.bonuses {
            let node = SKSpriteNode(color: .orange.withAlphaComponent(0.8), size: CGSize(width: level.tileSize, height: level.tileSize))
            node.anchorPoint = CGPoint(x: 0, y: 1)
            node.position = worldToScene(x: bonus.x, y: bonus.y)
            node.zPosition = 3

            // Question mark label
            let label = SKLabelNode(text: "?")
            label.fontSize = 28
            label.fontName = "Helvetica-Bold"
            label.fontColor = .white
            label.verticalAlignmentMode = .center
            label.horizontalAlignmentMode = .center
            label.position = CGPoint(x: level.tileSize / 2, y: -level.tileSize / 2)
            node.addChild(label)

            entityNode.addChild(node)
            bonusBlockNodes.append((block: bonus, node: node))
        }
    }

    // MARK: - Check Bonus Block Collisions

    private func checkBonusBlocks() {
        guard !player.isDead else { return }

        let playerRect = player.hitboxRect

        for i in bonusBlockNodes.indices {
            guard !bonusBlockNodes[i].block.triggered else { continue }

            let block = bonusBlockNodes[i].block
            let blockRect = CGRect(x: block.x, y: block.y, width: block.w, height: block.h)

            // Check head collision (player jumping into block from below)
            guard PhysicsSystem.aabb(playerRect, blockRect) else { continue }
            guard player.vy < 0 else { continue }  // Must be moving upward
            let playerTop = player.worldY
            let blockBottom = block.y + block.h
            guard playerTop <= blockBottom + 4 else { continue }

            bonusBlockNodes[i].block.triggered = true

            // Bump animation
            let bumpUp = SKAction.moveBy(x: 0, y: 4, duration: 0.08)
            let bumpDown = SKAction.moveBy(x: 0, y: -4, duration: 0.08)
            bonusBlockNodes[i].node.run(SKAction.sequence([bumpUp, bumpDown]))
            bonusBlockNodes[i].node.alpha = 0.4

            // Award reward
            let reward = block.rewardType
            var scoreGain = 0
            var goldGain = 0
            var heartGain = 0

            switch reward {
            case "royal-shield": scoreGain = 400; goldGain = 100
            case "double-axe":   scoreGain = 200; goldGain = 50
            case "flail":        scoreGain = 160; goldGain = 40
            case "helmet":       scoreGain = 120; goldGain = 30
            case "jewel":        scoreGain = 60;  goldGain = 12
            case "potion":       scoreGain = 20;  heartGain = 1
            case "coin":         scoreGain = 10;  goldGain = 4
            default:             scoreGain = 5
            }

            let blockCenterX = block.x + block.w / 2
            if goldGain > 0 {
                showFloatingText("+\(goldGain) pièces", at: CGPoint(x: blockCenterX, y: block.y - 10), color: .yellow)
            }
            if scoreGain > 0 {
                showFloatingText("+\(scoreGain)", at: CGPoint(x: blockCenterX, y: block.y - 30))
            }

            Task { [scoreGain, goldGain, heartGain] @MainActor in
                viewModel?.score += scoreGain
                viewModel?.gold += goldGain
                if heartGain > 0, let vm = viewModel {
                    vm.hearts = min(vm.hearts + heartGain, vm.maxHearts)
                }
            }
        }
    }

    // MARK: - Update Loop

    override func update(_ currentTime: TimeInterval) {
        if lastUpdateTime == 0 { lastUpdateTime = currentTime }
        let delta = min(CGFloat(currentTime - lastUpdateTime), GameConstants.maxDeltaTime)
        lastUpdateTime = currentTime

        guard !isPaused, currentLevel != nil else { return }

        // Death sequence: animate falling body, skip normal gameplay
        if deathSequenceActive {
            updateDeathSequence(delta: delta)
            updateEntities(delta: delta)
            updateEntityPositions()
            updateCamera(delta: delta)
            return
        }

        // Don't update gameplay during duel or tower interior
        if duelEnemy != nil || towerInteriorActive { return }

        runTime += delta
        playerPreviousY = player.worldY

        updatePlayerInput(delta: delta)
        updatePlayerPhysics(delta: delta)
        resolvePlayerCollisions()
        updateEntities(delta: delta)
        handleFire(delta: delta)
        updateProjectiles(delta: delta)
        checkEnemyCollisions()
        checkAnimalBounce()
        checkBonusBlocks()
        updateCoinDrops(delta: delta)
        updateGuards()
        updateSkyBirds(delta: delta)
        updateCrumblingPlatforms(delta: delta)
        updateMovingPlatforms(delta: delta)
        player.updateSprite(delta: delta)
        player.updateBlink(delta: delta)
        updatePlayerSpritePosition()
        updateEntityPositions()
        updateCamera(delta: delta)
        checkEndGoal()
        checkTowerEntry()
        syncHUD()
    }

    // MARK: - Player Input

    private func updatePlayerInput(delta: CGFloat) {
        guard let vm = viewModel, !player.isDead else { return }

        // During stun: apply stronger friction, skip input
        if player.stunTimeLeft > 0 {
            let stunFriction = pow(0.92, CGFloat(delta * 60))
            player.vx *= stunFriction
            if abs(player.vx) < 1 { player.vx = 0 }
            return
        }

        if vm.inputLeft {
            player.vx = -GameConstants.moveSpeed
            player.facing = "south-west"
        } else if vm.inputRight {
            player.vx = GameConstants.moveSpeed
            player.facing = "south-east"
        }
        if !vm.inputLeft && !vm.inputRight {
            // Frame-rate independent friction: pow(0.84, delta * 60)
            let frictionFactor = pow(GameConstants.friction, CGFloat(delta * 60))
            player.vx *= frictionFactor
            if abs(player.vx) < 1 { player.vx = 0 }
        }

        if vm.inputJump && !player.jumpHeld {
            player.jumpBufferTimeLeft = GameConstants.jumpBufferWindowSeconds
        }
        player.jumpHeld = vm.inputJump

        if player.onGround {
            player.coyoteTimeLeft = GameConstants.coyoteTimeSeconds
        } else {
            player.coyoteTimeLeft -= delta
        }

        if player.jumpBufferTimeLeft > 0 && player.coyoteTimeLeft > 0 {
            player.vy = GameConstants.jumpVelocity
            player.onGround = false
            player.coyoteTimeLeft = 0
            player.jumpBufferTimeLeft = 0
        }

        if player.jumpBufferTimeLeft > 0 {
            player.jumpBufferTimeLeft -= delta
        }

        if vm.inputJumpReleased && player.vy < 0 {
            player.vy *= GameConstants.jumpCutMultiplier
            vm.inputJumpReleased = false
        }
    }

    // MARK: - Player Physics

    private func updatePlayerPhysics(delta: CGFloat) {
        guard !player.isDead, let level = currentLevel else { return }

        player.vy += GameConstants.gravity * delta
        player.vy = min(player.vy, GameConstants.maxFallVelocity)

        player.worldX += player.vx * delta
        player.worldY += player.vy * delta

        player.worldX = max(0, min(player.worldX, level.worldWidth - player.hitboxWidth))

        if player.worldY > level.worldHeight + 200 {
            playerDied()
        }
    }

    // MARK: - Collision Resolution

    private func resolvePlayerCollisions() {
        guard !player.isDead, let level = currentLevel else { return }

        PhysicsSystem.resolveHorizontalCollisions(
            entityX: &player.worldX,
            entityY: player.worldY,
            entityW: player.hitboxWidth,
            entityH: player.hitboxHeight,
            entityVx: &player.vx,
            solidRects: groundCollisionRects,
            worldWidth: level.worldWidth
        )

        player.onGround = PhysicsSystem.resolveVerticalCollisions(
            entityX: player.worldX,
            entityY: &player.worldY,
            entityW: player.hitboxWidth,
            entityH: player.hitboxHeight,
            entityVy: &player.vy,
            solidRects: groundCollisionRects,
            oneWayRects: platformCollisionRects,
            previousY: playerPreviousY
        )
    }

    // MARK: - Entity Updates

    private func updateEntities(delta: CGFloat) {
        guard let level = currentLevel else { return }

        for enemy in enemies {
            enemy.update(delta: delta, groundSurfaceY: level.groundSurfaceY, worldWidth: level.worldWidth)
        }
        for animal in animals {
            animal.update(delta: delta, groundSurfaceY: level.groundSurfaceY, worldWidth: level.worldWidth)
        }
    }

    private func updateEntityPositions() {
        for enemy in enemies {
            let centerX = enemy.worldX + enemy.hitboxWidth / 2
            let centerY = enemy.worldY + enemy.hitboxHeight / 2
            var pos = worldToScene(x: centerX, y: centerY)
            if enemy.defeatFadeActive {
                pos.y += enemy.defeatRiseOffset
            }
            enemy.position = pos
        }
        for animal in animals {
            let centerX = animal.worldX + animal.hitboxWidth / 2
            let centerY = animal.worldY + animal.hitboxHeight / 2
            let pos = worldToScene(x: centerX, y: centerY)
            animal.position = pos
        }
    }

    // MARK: - Enemy Collision

    private func checkEnemyCollisions() {
        guard !player.isDead, player.invulnTimeLeft <= 0 else { return }

        let playerRect = player.hitboxRect

        for enemy in enemies {
            guard enemy.isAlive, !enemy.battling else { continue }
            guard PhysicsSystem.aabb(playerRect, enemy.hitboxRect) else { continue }
            triggerDuel(enemy: enemy)
            break
        }
    }

    // MARK: - Animal Bounce

    private func checkAnimalBounce() {
        guard !player.isDead else { return }

        let playerRect = player.hitboxRect

        for animal in animals {
            guard PhysicsSystem.aabb(playerRect, animal.hitboxRect) else { continue }

            let prevBottom = playerPreviousY + player.hitboxHeight

            if player.vy > 0 && prevBottom <= animal.worldY + animal.hitboxHeight * 0.4 {
                player.vy = GameConstants.animalBounceVelocity
                player.onGround = false

                if !animal.bounceRewardClaimed {
                    animal.bounceRewardClaimed = true
                    showFloatingText(
                        "+\(GameConstants.animalBounceCoins) pièces",
                        at: CGPoint(x: animal.worldX + animal.hitboxWidth / 2, y: animal.worldY - 10),
                        color: .yellow
                    )
                    Task { @MainActor in
                        viewModel?.score += GameConstants.animalBounceScore
                        viewModel?.gold += GameConstants.animalBounceCoins
                    }
                }
            }
        }
    }

    // MARK: - Duel System

    private func triggerDuel(enemy: EnemyNode) {
        duelEnemy = enemy
        enemy.battling = true

        let activeTenses = self.activeTenses
        let activeGroups = self.activeGroups

        guard let question = ConjugationData.makeQuestion(
            activeTenses: activeTenses,
            activeGroups: activeGroups
        ) else {
            resolveEnemyDefeat(enemy: enemy)
            return
        }

        let correctIndex = question.options.firstIndex(of: question.correct) ?? 0
        let pronoun = ConjugationData.pronouns[question.pronIdx]
        let prompt = "Conjugue « \(question.vKey) » au \(question.tenseLabel) pour « \(pronoun) »"

        let duelState = DuelState(
            prompt: prompt,
            answers: question.options,
            correctIndex: correctIndex,
            enemySpritePath: nil,
            heroSpritePath: nil,
            timeLimit: GameConstants.duelTimeLimitSeconds
        )

        Task { @MainActor in
            viewModel?.activeDuel = duelState
        }
    }

    func answerDuel(index: Int) {
        // Route to boss trial handler if boss is active
        if bossActive {
            answerBossTrial(index: index)
            return
        }

        // Route to tower chest if active
        if towerInteriorActive {
            answerTowerChest(index: index)
            return
        }

        guard let duel = viewModel?.activeDuel, let enemy = duelEnemy else { return }

        let correct = index == duel.correctIndex
        enemy.timesAnswered += 1
        let isFirstStrike = correct && enemy.timesAnswered == 1

        Task { @MainActor [weak self] in
            guard let self = self else { return }

            if correct {
                self.resolveEnemyDefeat(enemy: enemy, firstStrike: isFirstStrike)
            } else {
                enemy.battling = false
                self.damagePlayer(knockbackFromX: enemy.worldX)
            }

            try? await Task.sleep(for: .seconds(0.8))
            self.viewModel?.activeDuel = nil
            self.duelEnemy = nil
        }
    }

    private func resolveEnemyDefeat(enemy: EnemyNode, firstStrike: Bool = false) {
        enemy.defeat()
        let centerX = enemy.worldX + enemy.hitboxWidth / 2

        showFloatingText(
            "+\(GameConstants.enemyDefeatScore)",
            at: CGPoint(x: centerX, y: enemy.worldY - 10)
        )
        showFloatingText(
            "+\(GameConstants.enemyDefeatCoins) pièces",
            at: CGPoint(x: centerX, y: enemy.worldY - 30),
            color: .yellow
        )

        // Spawn coin drop visual entities
        spawnCoinDrops(at: CGPoint(x: centerX, y: enemy.worldY))

        var bonusScore = 0
        var bonusGold = 0
        if firstStrike {
            // Random first-strike reward: flail(160/40), helmet(120/30), or jewel(60/12)
            let roll = Int.random(in: 0...2)
            switch roll {
            case 0:  bonusScore = 160; bonusGold = 40
                showFloatingText("Premier coup ! +fléau", at: CGPoint(x: centerX, y: enemy.worldY - 50), color: .orange)
            case 1:  bonusScore = 120; bonusGold = 30
                showFloatingText("Premier coup ! +casque", at: CGPoint(x: centerX, y: enemy.worldY - 50), color: .cyan)
            default: bonusScore = 60;  bonusGold = 12
                showFloatingText("Premier coup ! +joyau", at: CGPoint(x: centerX, y: enemy.worldY - 50), color: .purple)
            }
        }

        Task { @MainActor in
            viewModel?.score += GameConstants.enemyDefeatScore + bonusScore
            viewModel?.gold += GameConstants.enemyDefeatCoins + bonusGold
        }
    }

    // MARK: - Coin Drops

    private struct CoinDrop {
        let node: SKSpriteNode
        var worldX: CGFloat
        var worldY: CGFloat
        var vx: CGFloat
        var vy: CGFloat
        var life: CGFloat
    }
    private var coinDrops: [CoinDrop] = []

    private func spawnCoinDrops(at worldPos: CGPoint) {
        for _ in 0..<GameConstants.enemyDefeatCoins {
            let coin = SKSpriteNode(color: .yellow, size: CGSize(width: 8, height: 8))
            coin.zPosition = 12
            entityNode.addChild(coin)

            let spread: CGFloat = CGFloat.random(in: -30...30)
            let launchVy: CGFloat = CGFloat.random(in: -280...(-180))

            coinDrops.append(CoinDrop(
                node: coin,
                worldX: worldPos.x + spread,
                worldY: worldPos.y,
                vx: spread * 2,
                vy: launchVy,
                life: 1.2
            ))
        }
    }

    private func updateCoinDrops(delta: CGFloat) {
        guard let level = currentLevel else { return }
        var toRemove: [Int] = []

        for i in coinDrops.indices {
            coinDrops[i].vy += GameConstants.enemyDropGravity * delta
            coinDrops[i].vy = min(coinDrops[i].vy, GameConstants.enemyDropMaxFallSpeed)
            coinDrops[i].worldX += coinDrops[i].vx * delta
            coinDrops[i].worldY += coinDrops[i].vy * delta
            coinDrops[i].life -= delta

            // Stop at ground
            if coinDrops[i].worldY >= level.groundSurfaceY {
                coinDrops[i].worldY = level.groundSurfaceY
                coinDrops[i].vy = 0
                coinDrops[i].vx = 0
            }

            let pos = worldToScene(x: coinDrops[i].worldX, y: coinDrops[i].worldY)
            coinDrops[i].node.position = pos

            if coinDrops[i].life <= 0 {
                coinDrops[i].node.alpha = max(0, coinDrops[i].life + 0.3) / 0.3
            }
            if coinDrops[i].life <= -0.3 {
                toRemove.append(i)
            }
        }

        for i in toRemove.sorted().reversed() {
            coinDrops[i].node.removeFromParent()
            coinDrops.remove(at: i)
        }
    }

    // MARK: - Projectiles

    private func handleFire(delta: CGFloat) {
        fireCooldown = max(0, fireCooldown - delta)
        guard let vm = viewModel, vm.inputFire, fireCooldown <= 0, !player.isDead else { return }

        let heroId = selectedHeroId.lowercased()
        let facingRight = player.facing == "south-east"
        let dirMult: CGFloat = facingRight ? 1 : -1

        var vx: CGFloat = 0
        var vy: CGFloat = 0
        var grav: CGFloat = 0
        var radius: CGFloat = 12
        var color: UIColor = .orange

        switch heroId {
        case "mage":
            vx = GameConstants.mageFireballSpeed * dirMult
            radius = GameConstants.mageFireballRadius
            color = .orange
        case "ninja":
            vx = GameConstants.ninjaShurkenSpeed * dirMult
            radius = GameConstants.ninjaShurikenRadius
            color = .lightGray
        case "pirate":
            vx = GameConstants.pirateSaberSpeedX * dirMult
            vy = GameConstants.pirateSaberSpeedY
            grav = GameConstants.pirateSaberGravity
            radius = GameConstants.pirateSaberRadius
            color = .brown
        case "barbarian":
            vx = GameConstants.barbarianAxeSpeed * dirMult
            radius = GameConstants.barbarianAxeRadius
            color = .darkGray
        case "golem":
            vx = GameConstants.golemRockSpeedX * dirMult
            vy = GameConstants.golemRockSpeedY
            grav = GameConstants.golemRockGravity
            radius = GameConstants.golemRockRadius
            color = .gray
        case "knight":
            vx = GameConstants.knightFireballSpeed * dirMult
            radius = GameConstants.knightFireballRadius
            color = .cyan
        default:
            return  // paladin and catwarrior have no projectile
        }

        let spawnX = player.worldX + player.hitboxWidth / 2 + dirMult * 20
        let spawnY = player.worldY + player.hitboxHeight * 0.4

        let projNode = SKSpriteNode(color: color, size: CGSize(width: radius * 2, height: radius * 2))
        projNode.zPosition = 9
        entityNode.addChild(projNode)

        projectiles.append(Projectile(
            node: projNode,
            worldX: spawnX, worldY: spawnY,
            vx: vx, vy: vy,
            gravity: grav, radius: radius
        ))

        fireCooldown = 0.3
        vm.inputFire = false
    }

    private func updateProjectiles(delta: CGFloat) {
        guard let level = currentLevel else { return }
        var toRemove: [Int] = []

        for i in projectiles.indices {
            projectiles[i].worldX += projectiles[i].vx * delta
            projectiles[i].vy += projectiles[i].gravity * delta
            projectiles[i].worldY += projectiles[i].vy * delta

            // Check bounds
            if projectiles[i].worldX < -50 || projectiles[i].worldX > level.worldWidth + 50 ||
               projectiles[i].worldY > level.worldHeight + 50 {
                toRemove.append(i)
                continue
            }

            // Check enemy hits
            let projRect = CGRect(
                x: projectiles[i].worldX - projectiles[i].radius,
                y: projectiles[i].worldY - projectiles[i].radius,
                width: projectiles[i].radius * 2,
                height: projectiles[i].radius * 2
            )

            for enemy in enemies {
                guard enemy.isAlive, !enemy.battling else { continue }
                if PhysicsSystem.aabb(projRect, enemy.hitboxRect) {
                    triggerDuel(enemy: enemy)
                    toRemove.append(i)
                    break
                }
            }

            // Update position
            let pos = worldToScene(x: projectiles[i].worldX, y: projectiles[i].worldY)
            projectiles[i].node.position = pos
        }

        // Remove in reverse order
        for i in toRemove.sorted().reversed() {
            guard i < projectiles.count else { continue }
            projectiles[i].node.removeFromParent()
            projectiles.remove(at: i)
        }
    }

    // MARK: - Boss Fight

    private func startBossFight() {
        bossActive = true
        bossTrialCount = 0
        bossCorrectStreak = 0

        // Create boss visual
        let boss = SKSpriteNode(color: .purple.withAlphaComponent(0.8), size: CGSize(width: 120, height: 120))
        boss.zPosition = 15
        guard let level = currentLevel else { return }
        let bossX = level.endX - 100
        let bossY = level.groundSurfaceY - 140
        boss.position = worldToScene(x: bossX, y: bossY)
        entityNode.addChild(boss)
        bossNode = boss

        // Show boss intro message
        Task { @MainActor in
            viewModel?.statusMessage = "Le Dragon apparaît !"
        }

        // Start first trial after delay
        Task { @MainActor [weak self] in
            try? await Task.sleep(for: .seconds(GameConstants.bossIntroMessageDelaySeconds))
            self?.presentBossTrial()
        }
    }

    private func presentBossTrial() {
        guard bossActive, bossTrialCount < GameConstants.bossTrialsRequired else { return }

        guard let question = ConjugationData.makeQuestion(
            activeTenses: activeTenses,
            activeGroups: activeGroups
        ) else { return }

        let correctIndex = question.options.firstIndex(of: question.correct) ?? 0
        let pronoun = ConjugationData.pronouns[question.pronIdx]
        let prompt = "Boss (\(bossTrialCount + 1)/\(GameConstants.bossTrialsRequired)) — Conjugue « \(question.vKey) » au \(question.tenseLabel) pour « \(pronoun) »"

        let duelState = DuelState(
            prompt: prompt,
            answers: question.options,
            correctIndex: correctIndex,
            enemySpritePath: nil,
            heroSpritePath: nil,
            timeLimit: GameConstants.bossTrialTimeLimitSeconds
        )

        Task { @MainActor in
            viewModel?.activeDuel = duelState
        }
    }

    func answerBossTrial(index: Int) {
        guard let duel = viewModel?.activeDuel, bossActive else { return }

        let correct = index == duel.correctIndex

        if correct {
            bossCorrectStreak += 1
        } else {
            bossCorrectStreak = 0  // Reset streak on wrong answer
        }

        Task { @MainActor [weak self] in
            guard let self = self else { return }
            self.viewModel?.activeDuel = nil

            try? await Task.sleep(for: .seconds(0.6))

            if self.bossCorrectStreak >= GameConstants.bossTrialsRequired {
                // All 5 correct in a row — victory!
                self.bossDefeated()
            } else if !correct {
                // Wrong answer — boss wins this round
                self.bossWins()
            } else {
                // Correct but not enough yet — next trial
                self.presentBossTrial()
            }
        }
    }

    private func bossDefeated() {
        bossActive = false
        bossNode?.run(SKAction.sequence([
            SKAction.fadeOut(withDuration: 1.0),
            SKAction.removeFromParent()
        ]))
        bossNode = nil

        Task { @MainActor in
            viewModel?.score += 500
            viewModel?.isVictory = true
        }
    }

    private func bossWins() {
        bossActive = false
        bossNode?.removeFromParent()
        bossNode = nil
        damagePlayer(knockbackFromX: player.worldX)
    }

    // MARK: - Tower Entry

    private func checkTowerEntry() {
        guard let level = currentLevel, let tower = level.tower,
              !player.isDead, !isTransitioning, !bossActive,
              !towerInteriorActive, towerChestState == "locked",
              duelEnemy == nil else { return }

        let playerRect = player.hitboxRect
        let towerEntryRect = CGRect(
            x: tower.x - tower.width / 2,
            y: tower.y + tower.height - level.tileSize,
            width: tower.width,
            height: level.tileSize
        )

        guard PhysicsSystem.aabb(playerRect, towerEntryRect) else { return }

        // Enter tower — start chest puzzle
        towerInteriorActive = true
        towerChestStreak = 0
        presentTowerChestQuestion()
    }

    private func presentTowerChestQuestion() {
        guard towerInteriorActive, towerChestState == "locked" else { return }

        guard let question = ConjugationData.makeQuestion(
            activeTenses: activeTenses,
            activeGroups: activeGroups
        ) else {
            towerInteriorActive = false
            return
        }

        let correctIndex = question.options.firstIndex(of: question.correct) ?? 0
        let pronoun = ConjugationData.pronouns[question.pronIdx]
        let prompt = "Coffre (\(towerChestStreak + 1)/\(towerChestRequired)) — Conjugue « \(question.vKey) » au \(question.tenseLabel) pour « \(pronoun) »"

        let duelState = DuelState(
            prompt: prompt,
            answers: question.options,
            correctIndex: correctIndex,
            enemySpritePath: nil,
            heroSpritePath: nil,
            timeLimit: GameConstants.duelTimeLimitSeconds
        )

        Task { @MainActor in
            viewModel?.activeDuel = duelState
        }
    }

    func answerTowerChest(index: Int) {
        guard let duel = viewModel?.activeDuel, towerInteriorActive else { return }

        let correct = index == duel.correctIndex

        if correct {
            towerChestStreak += 1
        } else {
            towerChestStreak = 0
        }

        Task { @MainActor [weak self] in
            guard let self = self else { return }
            self.viewModel?.activeDuel = nil

            try? await Task.sleep(for: .seconds(0.5))

            if self.towerChestStreak >= self.towerChestRequired {
                // Chest opened!
                self.towerChestState = "open"
                self.towerInteriorActive = false
                let goldReward = 50 + Int.random(in: 0...100)
                self.showFloatingText("+\(goldReward) pièces!", at: CGPoint(x: self.player.worldX, y: self.player.worldY - 20), color: .yellow)
                self.viewModel?.gold += goldReward
                self.viewModel?.score += self.viewModel!.score * 2
                self.viewModel?.statusMessage = "Coffre ouvert ! +\(goldReward) pièces"
            } else if !correct {
                // Failed — exit tower
                self.towerInteriorActive = false
                self.viewModel?.statusMessage = "Mauvaise réponse ! Réessayez plus tard."
            } else {
                // Correct but need more
                self.presentTowerChestQuestion()
            }
        }
    }

    // MARK: - Camera

    private func updateCamera(delta: CGFloat, snap: Bool = false) {
        guard let level = currentLevel else { return }
        let visibleWidth = GameConstants.virtualWidth
        let desired = player.worldX - visibleWidth * 0.35
        let maxX = max(0, level.worldWidth - visibleWidth)
        let target = max(0, min(desired, maxX))

        if snap {
            gameCameraX = target
        } else {
            let diff = target - gameCameraX
            if abs(diff) < GameConstants.cameraDeadzoneX { return }
            let t = 1 - exp(-GameConstants.cameraLerpSpeed * delta)
            gameCameraX += diff * t
        }

        let sceneCamX = gameCameraX + visibleWidth / 2 - level.worldWidth / 2
        cameraNode.position = CGPoint(x: sceneCamX, y: 0)

        // Update parallax
        parallaxBg.update(
            cameraX: gameCameraX,
            worldWidth: level.worldWidth,
            worldToScene: worldToSceneFunc()
        )
    }

    // MARK: - End Goal Check

    private func checkEndGoal() {
        guard let level = currentLevel, !player.isDead, !isTransitioning, !bossActive else { return }

        let playerRect = player.hitboxRect
        let goalRect = CGRect(x: level.endX, y: level.endY, width: level.endWidth, height: level.endHeight)

        guard PhysicsSystem.aabb(playerRect, goalRect) else { return }

        // Castle unlock: must defeat >50% of enemies
        let totalEnemies = level.enemySpawns.count
        let defeatedCount = enemies.filter { !$0.isAlive }.count
        let unlockRatio: CGFloat = totalEnemies > 0 ? CGFloat(defeatedCount) / CGFloat(totalEnemies) : 1.0

        if unlockRatio <= 0.5 {
            // Castle locked — show message (throttled to once per 0.9s)
            if runTime - lastStatusTime >= 0.9 {
                lastStatusTime = runTime
                let pct = Int(unlockRatio * 100)
                Task { @MainActor in
                    viewModel?.statusMessage = "Château verrouillé ! Ennemis vaincus : \(pct)%"
                }
            }
            return
        }

        // Award castle bonus
        Task { @MainActor in
            viewModel?.score += 100
            viewModel?.gold += 18
        }

        let nextIndex = currentLevelIndex + 1
        if nextIndex < levels.count {
            transitionToLevel(index: nextIndex)
        } else {
            // Last level complete — trigger boss fight
            startBossFight()
        }
    }

    private func transitionToLevel(index: Int) {
        isTransitioning = true

        // Fade to black
        let fadeIn = SKAction.fadeAlpha(to: 1, duration: 0.4)
        let load = SKAction.run { [weak self] in
            self?.loadLevel(index: index)
        }
        let fadeOut = SKAction.fadeAlpha(to: 0, duration: 0.4)
        let done = SKAction.run { [weak self] in
            self?.isTransitioning = false
        }
        fadeNode.run(SKAction.sequence([fadeIn, load, fadeOut, done]))
    }

    // MARK: - Death Sequence
    private var deathSequenceActive: Bool = false
    private var deathSequenceElapsed: CGFloat = 0

    // MARK: - Player Death

    private func playerDied() {
        guard !player.isDead else { return }
        player.isDead = true
        player.vx = 0
        player.vy = GameConstants.playerDeathLaunchY
        deathSequenceActive = true
        deathSequenceElapsed = 0

        Task { @MainActor in
            viewModel?.hearts -= 1
        }
    }

    /// Called each frame during death sequence to animate the body falling.
    private func updateDeathSequence(delta: CGFloat) {
        guard deathSequenceActive else { return }
        deathSequenceElapsed += delta

        // Apply gravity to the dead player (body falls)
        player.vy += GameConstants.gravity * delta
        player.vy = min(player.vy, GameConstants.maxFallVelocity)
        player.worldY += player.vy * delta

        // Update player animation time for death spin
        player.animTime += delta
        updatePlayerSpritePosition()

        if deathSequenceElapsed >= GameConstants.playerDeathDelaySeconds {
            deathSequenceActive = false
            Task { @MainActor [weak self] in
                guard let self = self else { return }
                if (self.viewModel?.hearts ?? 0) <= 0 {
                    self.viewModel?.isGameOver = true
                } else {
                    if let level = self.currentLevel {
                        self.spawnPlayer(level: level)
                    }
                }
            }
        }
    }

    // MARK: - Damage

    func damagePlayer(knockbackFromX: CGFloat) {
        guard player.invulnTimeLeft <= 0, !player.isDead, !deathSequenceActive else { return }

        player.invulnTimeLeft = GameConstants.playerHitInvulnSeconds
        player.stunTimeLeft = GameConstants.playerHitStunSeconds

        let knockDir: CGFloat = player.worldX > knockbackFromX ? 1 : -1
        player.vx = GameConstants.playerHitKnockbackX * knockDir
        player.vy = GameConstants.playerHitKnockbackY

        Task { @MainActor [weak self] in
            guard let self = self else { return }
            self.viewModel?.hearts -= 1
            if (self.viewModel?.hearts ?? 0) <= 0 {
                self.playerDied()
            }
        }
    }

    // MARK: - Floating Reward Text

    private func showFloatingText(_ text: String, at worldPos: CGPoint, color: UIColor = .white) {
        let label = SKLabelNode(text: text)
        label.fontName = "Helvetica-Bold"
        label.fontSize = 18
        label.fontColor = color
        label.zPosition = 50
        label.position = worldToScene(x: worldPos.x, y: worldPos.y)
        entityNode.addChild(label)

        let rise = SKAction.moveBy(x: 0, y: 40, duration: 0.8)
        let fade = SKAction.fadeOut(withDuration: 0.8)
        let group = SKAction.group([rise, fade])
        label.run(SKAction.sequence([group, SKAction.removeFromParent()]))
    }

    // MARK: - HUD Sync

    private func syncHUD() {
        // HUD is updated via viewModel @Published properties
    }

    // MARK: - Public API

    func restartCurrentLevel() {
        Task { @MainActor in
            viewModel?.hearts = GameConstants.startingHearts(for: difficultyMode)
            viewModel?.score = 0
            viewModel?.gold = 0
            viewModel?.isGameOver = false
            viewModel?.isVictory = false
        }
        levels = LevelGenerator.generateLevels(profile: difficultyMode)
        loadLevel(index: 0)
    }
}

// MARK: - UIColor Hex Extension

extension UIColor {
    convenience init(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        s = s.replacingOccurrences(of: "#", with: "")
        var rgb: UInt64 = 0
        Scanner(string: s).scanHexInt64(&rgb)
        self.init(
            red: CGFloat((rgb >> 16) & 0xFF) / 255,
            green: CGFloat((rgb >> 8) & 0xFF) / 255,
            blue: CGFloat(rgb & 0xFF) / 255,
            alpha: 1
        )
    }
}
