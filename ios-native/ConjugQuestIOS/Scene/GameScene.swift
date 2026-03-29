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

    // MARK: - Player
    private var player = PlayerNode()
    private var playerPreviousY: CGFloat = 0

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

        // Generate all levels
        levels = LevelGenerator.generateLevels()
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

        // Build collision data
        buildCollisionData(level: level)

        // Draw visuals
        drawBackground(level: level)
        drawParallax(level: level)
        drawGroundTiles(level: level)
        drawPlatformTiles(level: level)
        drawEndGoal(level: level)

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
        player.loadHero(id: "paladin") // TODO: use selected hero from AppState
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

    // MARK: - Update Loop

    override func update(_ currentTime: TimeInterval) {
        if lastUpdateTime == 0 { lastUpdateTime = currentTime }
        let delta = min(CGFloat(currentTime - lastUpdateTime), GameConstants.maxDeltaTime)
        lastUpdateTime = currentTime

        guard !isPaused, currentLevel != nil else { return }

        runTime += delta
        playerPreviousY = player.worldY

        updatePlayerInput(delta: delta)
        updatePlayerPhysics(delta: delta)
        resolvePlayerCollisions()
        player.updateSprite(delta: delta)
        player.updateBlink(delta: delta)
        updatePlayerSpritePosition()
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

        if player.worldY > GameConstants.virtualHeight + 200 {
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
        guard let level = currentLevel, !player.isDead else { return }

        let playerRect = player.hitboxRect
        let goalRect = CGRect(x: level.endX, y: level.endY, width: level.endWidth, height: level.endHeight)

        if PhysicsSystem.aabb(playerRect, goalRect) {
            // Level complete — load next
            let nextIndex = currentLevelIndex + 1
            if nextIndex < levels.count {
                loadLevel(index: nextIndex)
            } else {
                // Victory!
                Task { @MainActor in
                    viewModel?.isVictory = true
                }
            }
        }
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
            viewModel?.hearts = GameConstants.startingHearts(for: "normal")
            viewModel?.isGameOver = false
            viewModel?.isVictory = false
        }
        levels = LevelGenerator.generateLevels()
        loadLevel(index: currentLevelIndex)
    }

    func answerDuel(index: Int) {
        // Phase 4
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
