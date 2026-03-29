import Foundation
import SpriteKit

/// Main game scene — owns all gameplay: physics, camera, entities, rendering.
/// Uses a 432x768 virtual canvas with .aspectFill scaling so SpriteKit
/// handles adaptation to any screen size without distortion.
///
/// Coordinate system: We use Y-down internally (matching HTML game) for all
/// game logic (worldX, worldY, collision). SpriteKit Y-up is only used for
/// final node positioning via worldToScene().
class GameScene: SKScene {

    // MARK: - View Model (bridge to SwiftUI)
    private var viewModel: GameViewModel?

    // MARK: - Camera
    private let cameraNode = SKCameraNode()
    private var gameCameraX: CGFloat = 0  // World X of camera (Y-down coords)

    // MARK: - World
    private let tileSize: CGFloat = 64
    private var worldWidthTiles: Int = 120
    private var worldHeightTiles: Int = 36
    private var worldWidth: CGFloat { CGFloat(worldWidthTiles) * tileSize }
    private var worldHeight: CGFloat { CGFloat(worldHeightTiles) * tileSize }

    // MARK: - Ground
    /// Ground surface Y in Y-down world coords.
    /// In HTML game: ground is at ~row 28 of 36, so groundSurfaceY ≈ 28*tileSize.
    /// For the initial flat level, we use a simpler value matching the HTML canvas.
    private var groundSurfaceY: CGFloat = 0
    private let groundNode = SKNode()
    private let backgroundNode = SKNode()
    private let entityNode = SKNode()

    // MARK: - Ground Collision
    private var groundCollisionRects: [CGRect] = []
    private var platformCollisionRects: [CGRect] = []
    private var groundHoles: [(start: Int, end: Int)] = []

    // MARK: - Player
    private var player = PlayerNode()
    private var playerPreviousY: CGFloat = 0

    // MARK: - Timing
    private var lastUpdateTime: TimeInterval = 0

    // MARK: - Current Biome
    private var currentBiome: String = "forest"

    // MARK: - Coordinate Conversion
    /// Convert Y-down world coords to SpriteKit scene coords.
    /// Scene has anchor (0.5, 0.5), so center is (0, 0).
    /// World (0, 0) = top-left in Y-down = scene (-worldWidth/2, virtualHeight/2) in Y-up.
    private func worldToScene(x: CGFloat, y: CGFloat) -> CGPoint {
        CGPoint(
            x: x - worldWidth / 2,
            y: GameConstants.virtualHeight / 2 - y
        )
    }

    /// Convert SpriteKit scene coords to Y-down world coords.
    private func sceneToWorld(point: CGPoint) -> (x: CGFloat, y: CGFloat) {
        (
            x: point.x + worldWidth / 2,
            y: GameConstants.virtualHeight / 2 - point.y
        )
    }

    // MARK: - Setup

    func bind(to viewModel: GameViewModel) {
        self.viewModel = viewModel
        viewModel.scene = self
    }

    override func didMove(to view: SKView) {
        backgroundColor = .black
        anchorPoint = CGPoint(x: 0.5, y: 0.5)

        // Camera
        addChild(cameraNode)
        camera = cameraNode

        // Layer nodes
        backgroundNode.zPosition = -100
        addChild(backgroundNode)

        groundNode.zPosition = 0
        addChild(groundNode)

        entityNode.zPosition = 10
        addChild(entityNode)

        // Player
        entityNode.addChild(player)

        // Build initial level
        buildLevel(biome: "forest")
    }

    // MARK: - Level Building

    func buildLevel(biome: String) {
        currentBiome = biome
        groundNode.removeAllChildren()
        backgroundNode.removeAllChildren()
        groundHoles = []
        platformCollisionRects = []

        // Ground surface in Y-down: near the bottom of the visible area.
        // HTML game: virtual height = 768, ground at roughly Y = 768 - 4*64 = 512
        // (4 tiles of ground thickness from the bottom).
        groundSurfaceY = GameConstants.virtualHeight - CGFloat(GameConstants.groundThicknessTiles) * tileSize

        // Build collision rects for ground
        groundCollisionRects = PhysicsSystem.buildGroundRects(
            groundSurfaceY: groundSurfaceY,
            tileSize: tileSize,
            worldWidthTiles: worldWidthTiles,
            holes: groundHoles
        )

        // Draw visuals
        drawBackground(biome: biome)
        drawGround(biome: biome)
        drawParallaxBackground(biome: biome)

        // Spawn player
        spawnPlayer()

        // Reset camera
        gameCameraX = player.worldX
        updateCamera(delta: 1.0 / 60.0, snap: true)

        Task { @MainActor in
            viewModel?.currentBiome = biome
        }
    }

    // MARK: - Player Spawn

    private func spawnPlayer() {
        player.loadHero(id: "paladin")
        // Spawn at start of level, on the ground
        player.worldX = tileSize * 3  // 3 tiles from left
        player.worldY = groundSurfaceY - player.hitboxHeight  // On top of ground
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
        // Convert hitbox center to scene position
        let centerX = player.worldX + player.hitboxWidth / 2
        let centerY = player.worldY + player.hitboxHeight / 2
        let scenePos = worldToScene(x: centerX, y: centerY)
        player.position = scenePos
    }

    // MARK: - Background

    private func drawBackground(biome: String) {
        guard let colors = GameConstants.biomeBackgroundColors[biome] else { return }
        let topColor = UIColor(hex: colors.top)
        let bottomColor = UIColor(hex: colors.bottom)

        let gradientSize = CGSize(width: GameConstants.virtualWidth, height: GameConstants.virtualHeight)
        let renderer = UIGraphicsImageRenderer(size: gradientSize)
        let image = renderer.image { ctx in
            let cgCtx = ctx.cgContext
            let colorSpace = CGColorSpaceCreateDeviceRGB()
            let gradientColors = [topColor.cgColor, bottomColor.cgColor] as CFArray
            let locations: [CGFloat] = [0.0, 1.0]
            if let gradient = CGGradient(colorsSpace: colorSpace, colors: gradientColors, locations: locations) {
                cgCtx.drawLinearGradient(
                    gradient,
                    start: CGPoint(x: 0, y: 0),
                    end: CGPoint(x: 0, y: gradientSize.height),
                    options: []
                )
            }
        }

        let tex = SKTexture(image: image)
        tex.filteringMode = .nearest
        let tilesNeeded = Int(ceil(worldWidth / GameConstants.virtualWidth)) + 1
        for i in 0..<tilesNeeded {
            let bg = SKSpriteNode(texture: tex, size: gradientSize)
            bg.anchorPoint = CGPoint(x: 0, y: 1) // top-left
            let pos = worldToScene(x: CGFloat(i) * GameConstants.virtualWidth, y: 0)
            bg.position = pos
            bg.zPosition = -100
            backgroundNode.addChild(bg)
        }
    }

    private func drawParallaxBackground(biome: String) {
        guard let path = GameConstants.biomeParallaxBackgrounds[biome],
              let tex = AssetManager.shared.texture(for: path) else { return }

        let texSize = tex.size()
        let scale = max(
            GameConstants.virtualHeight / texSize.height,
            GameConstants.virtualWidth / texSize.width,
            1
        )
        let drawW = texSize.width * scale
        let drawH = texSize.height * scale

        let copies = Int(ceil(worldWidth / drawW)) + 2
        for i in 0..<copies {
            let sprite = SKSpriteNode(texture: tex, size: CGSize(width: drawW, height: drawH))
            sprite.anchorPoint = CGPoint(x: 0, y: 1)
            let pos = worldToScene(x: CGFloat(i) * drawW, y: 0)
            sprite.position = pos
            sprite.zPosition = -50
            sprite.name = "parallax_\(i)"
            backgroundNode.addChild(sprite)
        }
    }

    // MARK: - Ground Tiles

    private func drawGround(biome: String) {
        let style = GameConstants.groundTileStyleByBiome[biome] ?? "forest"
        let tileFiles = GameConstants.groundTileFilesByStyle[style] ?? []
        if tileFiles.isEmpty { drawFallbackGround(); return }

        let textures: [SKTexture] = tileFiles.compactMap { file in
            AssetManager.shared.texture(for: "game_assets/ground/\(style)/\(file)")
        }
        if textures.isEmpty { drawFallbackGround(); return }

        let groundThickness = GameConstants.groundThicknessTiles
        for col in 0..<worldWidthTiles {
            for row in 0..<groundThickness {
                let tex = textures[(col + row * 7) % textures.count]
                let sprite = SKSpriteNode(texture: tex, size: CGSize(width: tileSize + 2, height: tileSize + 2))
                sprite.anchorPoint = CGPoint(x: 0, y: 1) // top-left
                let tileWorldY = groundSurfaceY + CGFloat(row) * tileSize
                let pos = worldToScene(x: CGFloat(col) * tileSize, y: tileWorldY)
                sprite.position = pos
                sprite.zPosition = 1
                groundNode.addChild(sprite)
            }
        }
    }

    private func drawFallbackGround() {
        let rect = SKSpriteNode(
            color: UIColor(red: 0.2, green: 0.5, blue: 0.3, alpha: 1),
            size: CGSize(width: worldWidth, height: tileSize * CGFloat(GameConstants.groundThicknessTiles))
        )
        rect.anchorPoint = CGPoint(x: 0, y: 1)
        let pos = worldToScene(x: 0, y: groundSurfaceY)
        rect.position = pos
        rect.zPosition = 1
        groundNode.addChild(rect)
    }

    // MARK: - Update Loop

    override func update(_ currentTime: TimeInterval) {
        if lastUpdateTime == 0 { lastUpdateTime = currentTime }
        let delta = min(CGFloat(currentTime - lastUpdateTime), GameConstants.maxDeltaTime)
        lastUpdateTime = currentTime

        guard !isPaused else { return }

        // Store previous Y for one-way platform collision
        playerPreviousY = player.worldY

        // 1. Read input from SwiftUI controls
        updatePlayerInput(delta: delta)

        // 2. Apply physics
        updatePlayerPhysics(delta: delta)

        // 3. Resolve collisions
        resolvePlayerCollisions()

        // 4. Update animation
        player.updateSprite(delta: delta)
        player.updateBlink(delta: delta)

        // 5. Update sprite position in scene
        updatePlayerSpritePosition()

        // 6. Camera
        updateCamera(delta: delta)

        // 7. Sync HUD
        syncHUD()
    }

    // MARK: - Player Input

    private func updatePlayerInput(delta: CGFloat) {
        guard let vm = viewModel, player.stunTimeLeft <= 0, !player.isDead else { return }

        // Horizontal movement
        if vm.inputLeft {
            player.vx = -GameConstants.moveSpeed
            player.facing = "south-west"
        } else if vm.inputRight {
            player.vx = GameConstants.moveSpeed
            player.facing = "south-east"
        }
        // Friction when no input
        if !vm.inputLeft && !vm.inputRight {
            player.vx *= GameConstants.friction
            if abs(player.vx) < 1 { player.vx = 0 }
        }

        // Jump buffer: if jump pressed, start buffer timer
        if vm.inputJump && !player.jumpHeld {
            player.jumpBufferTimeLeft = GameConstants.jumpBufferWindowSeconds
        }
        player.jumpHeld = vm.inputJump

        // Coyote time: track time since last on ground
        if player.onGround {
            player.coyoteTimeLeft = GameConstants.coyoteTimeSeconds
        } else {
            player.coyoteTimeLeft -= delta
        }

        // Execute jump if buffer and coyote time both valid
        if player.jumpBufferTimeLeft > 0 && player.coyoteTimeLeft > 0 {
            player.vy = GameConstants.jumpVelocity  // -525 (upward in Y-down)
            player.onGround = false
            player.coyoteTimeLeft = 0
            player.jumpBufferTimeLeft = 0
        }

        // Jump buffer decay
        if player.jumpBufferTimeLeft > 0 {
            player.jumpBufferTimeLeft -= delta
        }

        // Variable jump height: release jump early to cut velocity
        if vm.inputJumpReleased && player.vy < 0 {
            player.vy *= GameConstants.jumpCutMultiplier  // 0.4x
            vm.inputJumpReleased = false
        }
    }

    // MARK: - Player Physics

    private func updatePlayerPhysics(delta: CGFloat) {
        guard !player.isDead else { return }

        // Gravity (Y-down: positive = downward)
        player.vy += GameConstants.gravity * delta
        player.vy = min(player.vy, GameConstants.maxFallVelocity)

        // Apply velocity
        player.worldX += player.vx * delta
        player.worldY += player.vy * delta

        // Clamp to world bounds
        player.worldX = max(0, min(player.worldX, worldWidth - player.hitboxWidth))

        // Death by falling off screen
        if player.worldY > GameConstants.virtualHeight + 200 {
            playerDied()
        }
    }

    // MARK: - Collision Resolution

    private func resolvePlayerCollisions() {
        guard !player.isDead else { return }

        // Horizontal collisions with ground
        PhysicsSystem.resolveHorizontalCollisions(
            entityX: &player.worldX,
            entityY: player.worldY,
            entityW: player.hitboxWidth,
            entityH: player.hitboxHeight,
            entityVx: &player.vx,
            solidRects: groundCollisionRects,
            worldWidth: worldWidth
        )

        // Vertical collisions with ground and platforms
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
        let visibleWidth = GameConstants.virtualWidth
        // Player at 65% from left (35% offset)
        let desired = player.worldX - visibleWidth * 0.35
        let maxX = max(0, worldWidth - visibleWidth)
        let target = max(0, min(desired, maxX))

        if snap {
            gameCameraX = target
        } else {
            let diff = target - gameCameraX
            if abs(diff) < GameConstants.cameraDeadzoneX { return }
            // Exponential lerp: 1 - e^(-speed * dt)
            let t = 1 - exp(-GameConstants.cameraLerpSpeed * delta)
            gameCameraX += diff * t
        }

        // Convert camera X (Y-down world) to scene position
        let sceneCamX = gameCameraX + visibleWidth / 2 - worldWidth / 2
        cameraNode.position = CGPoint(x: sceneCamX, y: 0)
    }

    // MARK: - Player Death

    private func playerDied() {
        guard !player.isDead else { return }
        player.isDead = true
        player.vy = GameConstants.playerDeathLaunchY  // Launch upward on death

        Task { @MainActor [weak self] in
            guard let self = self else { return }
            self.viewModel?.hearts -= 1
            if (self.viewModel?.hearts ?? 0) <= 0 {
                self.viewModel?.isGameOver = true
            } else {
                // Respawn after short delay
                try? await Task.sleep(for: .seconds(GameConstants.playerDeathDelaySeconds))
                self.spawnPlayer()
            }
        }
    }

    // MARK: - Damage

    func damagePlayer(knockbackFromX: CGFloat) {
        guard player.invulnTimeLeft <= 0, !player.isDead else { return }

        player.invulnTimeLeft = GameConstants.playerHitInvulnSeconds
        player.stunTimeLeft = GameConstants.playerHitStunSeconds

        // Knockback direction: away from damage source
        let knockDir: CGFloat = player.worldX > knockbackFromX ? 1 : -1
        player.vx = GameConstants.playerHitKnockbackX * knockDir
        player.vy = GameConstants.playerHitKnockbackY  // Upward bounce

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
        // Will sync score/gold in later phases
    }

    // MARK: - Public API

    func restartCurrentLevel() {
        Task { @MainActor in
            viewModel?.hearts = GameConstants.startingHearts(for: "normal")
            viewModel?.isGameOver = false
            viewModel?.isVictory = false
        }
        buildLevel(biome: currentBiome)
    }

    func answerDuel(index: Int) {
        // Phase 4
    }
}

// MARK: - UIColor Hex Extension

extension UIColor {
    convenience init(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

        var rgb: UInt64 = 0
        Scanner(string: hexSanitized).scanHexInt64(&rgb)

        let r = CGFloat((rgb & 0xFF0000) >> 16) / 255.0
        let g = CGFloat((rgb & 0x00FF00) >> 8) / 255.0
        let b = CGFloat(rgb & 0x0000FF) / 255.0

        self.init(red: r, green: g, blue: b, alpha: 1.0)
    }
}
