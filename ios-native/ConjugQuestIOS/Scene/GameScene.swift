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
        drawPlatformTiles(level: level)
        drawEndGoal(level: level)

        // Spawn entities
        spawnEnemies(level: level)
        spawnAnimals(level: level)

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

    // MARK: - Draw Platform Tiles

    private func drawPlatformTiles(level: Level) {
        for rail in level.platformRails {
            for col in rail.startX..<rail.endX {
                guard col >= 0, col < level.widthTiles else { continue }
                let texPath = "game_assets/platforms/wood/woodhalf_tile_r01_c02_01.png"
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
        let goalSize = CGSize(width: level.endWidth, height: level.endHeight)
        let goal = SKSpriteNode(color: .yellow.withAlphaComponent(0.6), size: goalSize)
        goal.anchorPoint = CGPoint(x: 0.5, y: 1)
        goal.position = worldToScene(x: level.endX + level.endWidth / 2, y: level.endY)
        goal.zPosition = 5

        // Add a label
        let label = SKLabelNode(text: "🏰")
        label.fontSize = 48
        label.verticalAlignmentMode = .center
        label.position = CGPoint(x: 0, y: -goalSize.height / 2)
        goal.addChild(label)

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

    // MARK: - Update Loop

    override func update(_ currentTime: TimeInterval) {
        if lastUpdateTime == 0 { lastUpdateTime = currentTime }
        let delta = min(CGFloat(currentTime - lastUpdateTime), GameConstants.maxDeltaTime)
        lastUpdateTime = currentTime

        guard !isPaused, currentLevel != nil else { return }

        // Don't update gameplay during duel
        if duelEnemy != nil { return }

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
        player.updateSprite(delta: delta)
        player.updateBlink(delta: delta)
        updatePlayerSpritePosition()
        updateEntityPositions()
        updateCamera(delta: delta)
        checkEndGoal()
        syncHUD()
    }

    // MARK: - Player Input

    private func updatePlayerInput(delta: CGFloat) {
        guard let vm = viewModel, player.stunTimeLeft <= 0, !player.isDead else { return }

        if vm.inputLeft {
            player.vx = -GameConstants.moveSpeed
            player.facing = "south-west"
        } else if vm.inputRight {
            player.vx = GameConstants.moveSpeed
            player.facing = "south-east"
        }
        if !vm.inputLeft && !vm.inputRight {
            player.vx *= GameConstants.friction
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

        guard let duel = viewModel?.activeDuel, let enemy = duelEnemy else { return }

        let correct = index == duel.correctIndex

        Task { @MainActor [weak self] in
            guard let self = self else { return }

            if correct {
                self.resolveEnemyDefeat(enemy: enemy)
            } else {
                enemy.battling = false
                self.damagePlayer(knockbackFromX: enemy.worldX)
            }

            try? await Task.sleep(for: .seconds(0.8))
            self.viewModel?.activeDuel = nil
            self.duelEnemy = nil
        }
    }

    private func resolveEnemyDefeat(enemy: EnemyNode) {
        enemy.defeat()
        Task { @MainActor in
            viewModel?.score += GameConstants.enemyDefeatScore
            viewModel?.gold += GameConstants.enemyDefeatCoins
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
        bossTrialCount += 1

        if correct {
            bossCorrectStreak += 1
        }

        Task { @MainActor [weak self] in
            guard let self = self else { return }
            self.viewModel?.activeDuel = nil

            try? await Task.sleep(for: .seconds(0.6))

            if self.bossTrialCount >= GameConstants.bossTrialsRequired {
                // Boss fight over
                if self.bossCorrectStreak >= 3 {
                    self.bossDefeated()
                } else {
                    self.bossWins()
                }
            } else {
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

        if PhysicsSystem.aabb(playerRect, goalRect) {
            let nextIndex = currentLevelIndex + 1
            if nextIndex < levels.count {
                transitionToLevel(index: nextIndex)
            } else {
                // Last level complete — trigger boss fight
                startBossFight()
            }
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

    // MARK: - Player Death

    private func playerDied() {
        guard !player.isDead else { return }
        player.isDead = true
        player.vy = GameConstants.playerDeathLaunchY

        Task { @MainActor [weak self] in
            guard let self = self else { return }
            self.viewModel?.hearts -= 1
            if (self.viewModel?.hearts ?? 0) <= 0 {
                self.viewModel?.isGameOver = true
            } else {
                try? await Task.sleep(for: .seconds(GameConstants.playerDeathDelaySeconds))
                if let level = self.currentLevel {
                    self.spawnPlayer(level: level)
                }
            }
        }
    }

    // MARK: - Damage

    func damagePlayer(knockbackFromX: CGFloat) {
        guard player.invulnTimeLeft <= 0, !player.isDead else { return }

        player.invulnTimeLeft = GameConstants.playerHitInvulnSeconds
        player.stunTimeLeft = GameConstants.playerHitStunSeconds

        let knockDir: CGFloat = player.worldX > knockbackFromX ? 1 : -1
        player.vx = GameConstants.playerHitKnockbackX * knockDir
        player.vy = GameConstants.playerHitKnockbackY

        Task { @MainActor in
            viewModel?.hearts -= 1
            if (viewModel?.hearts ?? 0) <= 0 {
                player.isDead = true
                viewModel?.isGameOver = true
            }
        }
    }

    // MARK: - HUD Sync

    private func syncHUD() {
        // Score and gold sync will be added in later phases
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
