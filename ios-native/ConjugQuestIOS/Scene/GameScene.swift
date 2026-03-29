import Foundation
import SpriteKit

/// Main game scene — owns all gameplay: physics, camera, entities, rendering.
/// Uses a 432x768 virtual canvas with .aspectFill scaling so SpriteKit
/// handles adaptation to any screen size without distortion.
///
/// Coordinate system: origin at bottom-left (SpriteKit default).
/// Y=0 is the bottom of the scene, Y=768 is the top.
/// The HTML game uses Y-down, so we invert when porting coordinates.
class GameScene: SKScene {

    // MARK: - View Model (bridge to SwiftUI)
    private var viewModel: GameViewModel?

    // MARK: - Camera
    private let cameraNode = SKCameraNode()
    private var gameCameraX: CGFloat = 0

    // MARK: - World
    private let tileSize: CGFloat = 64
    private var worldWidthTiles: Int = 120
    private var worldHeightTiles: Int = 36
    private var worldWidth: CGFloat { CGFloat(worldWidthTiles) * tileSize }
    private var worldHeight: CGFloat { CGFloat(worldHeightTiles) * tileSize }

    // MARK: - Ground
    private var groundY: CGFloat = 0  // Y position of ground surface in scene coords
    private let groundNode = SKNode()
    private let backgroundNode = SKNode()

    // MARK: - Player (placeholder for Phase 2)
    private var playerNode: SKSpriteNode?

    // MARK: - Timing
    private var lastUpdateTime: TimeInterval = 0

    // MARK: - Current Biome
    private var currentBiome: String = "forest"

    // MARK: - Setup

    func bind(to viewModel: GameViewModel) {
        self.viewModel = viewModel
        viewModel.scene = self
    }

    override func didMove(to view: SKView) {
        backgroundColor = .black
        anchorPoint = CGPoint(x: 0.5, y: 0.5) // Center anchor for camera

        // Camera
        addChild(cameraNode)
        camera = cameraNode

        // Background layer (behind everything)
        backgroundNode.zPosition = -100
        addChild(backgroundNode)

        // Ground layer
        groundNode.zPosition = 0
        addChild(groundNode)

        // Build initial level
        buildLevel(biome: "forest")
    }

    // MARK: - Level Building

    func buildLevel(biome: String) {
        currentBiome = biome
        groundNode.removeAllChildren()
        backgroundNode.removeAllChildren()

        // Ground surface Y: in the HTML game, ground is at roughly row 28 of 36 (from top).
        // In SpriteKit (Y-up): groundSurfaceY = (36 - 28) * tileSize = 8 * tileSize = 512
        // But in the HTML game the virtual canvas is 768 tall, and ground is at about
        // the bottom quarter. Let's place ground at y = tileSize * 4 = 256 (4 tiles from bottom).
        let groundTileRow = GameConstants.groundThicknessTiles // 4 tiles of ground
        groundY = CGFloat(groundTileRow) * tileSize // 256

        // Draw gradient background
        drawBackground(biome: biome)

        // Draw ground tiles
        drawGround(biome: biome)

        // Draw parallax background image
        drawParallaxBackground(biome: biome)

        // Reset camera
        gameCameraX = 0
        updateCameraPosition()

        Task { @MainActor in
            viewModel?.currentBiome = biome
        }
    }

    // MARK: - Background

    private func drawBackground(biome: String) {
        guard let colors = GameConstants.biomeBackgroundColors[biome] else { return }
        let topColor = UIColor(hex: colors.top)
        let bottomColor = UIColor(hex: colors.bottom)

        // Create gradient texture covering the full scene
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

        // Tile the gradient background across the full world width
        let tex = SKTexture(image: image)
        tex.filteringMode = .nearest
        let tilesNeeded = Int(ceil(worldWidth / GameConstants.virtualWidth)) + 1
        for i in 0..<tilesNeeded {
            let bg = SKSpriteNode(texture: tex, size: gradientSize)
            bg.anchorPoint = CGPoint(x: 0, y: 0)
            // Position in world coords (bottom-left of each tile)
            let worldX = CGFloat(i) * GameConstants.virtualWidth - worldWidth / 2
            bg.position = CGPoint(x: worldX, y: -GameConstants.virtualHeight / 2)
            bg.zPosition = -100
            backgroundNode.addChild(bg)
        }
    }

    private func drawParallaxBackground(biome: String) {
        guard let path = GameConstants.biomeParallaxBackgrounds[biome],
              let tex = AssetManager.shared.texture(for: path) else { return }

        let texSize = tex.size()
        // Scale to fill scene height
        let scale = max(GameConstants.virtualHeight / texSize.height, GameConstants.virtualWidth / texSize.width, 1)
        let drawW = texSize.width * scale
        let drawH = texSize.height * scale

        // Place a few copies for parallax scrolling (we'll offset in update)
        let copies = Int(ceil(worldWidth / drawW)) + 2
        for i in 0..<copies {
            let sprite = SKSpriteNode(texture: tex, size: CGSize(width: drawW, height: drawH))
            sprite.anchorPoint = CGPoint(x: 0, y: 0)
            sprite.position = CGPoint(
                x: CGFloat(i) * drawW - worldWidth / 2,
                y: -GameConstants.virtualHeight / 2
            )
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

        // Load tile textures
        let textures: [SKTexture] = tileFiles.compactMap { file in
            AssetManager.shared.texture(for: "game_assets/ground/\(style)/\(file)")
        }
        if textures.isEmpty { drawFallbackGround(); return }

        // Place ground tiles across the world
        let groundThickness = GameConstants.groundThicknessTiles
        for col in 0..<worldWidthTiles {
            for row in 0..<groundThickness {
                let tex = textures[(col + row * 7) % textures.count]
                let sprite = SKSpriteNode(texture: tex, size: CGSize(width: tileSize + 2, height: tileSize + 2))
                sprite.anchorPoint = CGPoint(x: 0, y: 1) // Top-left anchor
                let worldX = CGFloat(col) * tileSize - worldWidth / 2
                let worldY = groundY - CGFloat(row) * tileSize - GameConstants.virtualHeight / 2
                sprite.position = CGPoint(x: worldX, y: worldY)
                sprite.zPosition = 1
                groundNode.addChild(sprite)
            }
        }
    }

    private func drawFallbackGround() {
        // Solid green rectangle as fallback
        let groundRect = SKSpriteNode(
            color: UIColor(red: 0.2, green: 0.5, blue: 0.3, alpha: 1),
            size: CGSize(width: worldWidth, height: tileSize * CGFloat(GameConstants.groundThicknessTiles))
        )
        groundRect.anchorPoint = CGPoint(x: 0, y: 1)
        groundRect.position = CGPoint(x: -worldWidth / 2, y: groundY - GameConstants.virtualHeight / 2)
        groundRect.zPosition = 1
        groundNode.addChild(groundRect)
    }

    // MARK: - Camera

    private func updateCameraPosition() {
        // Camera X is clamped to keep the world in view
        let halfVisibleWidth = GameConstants.virtualWidth * 0.5
        let levelLeft = -worldWidth / 2
        let levelRight = worldWidth / 2
        let minX = levelLeft + halfVisibleWidth
        let maxX = levelRight - halfVisibleWidth
        let clampedX = min(max(gameCameraX - worldWidth / 2 + halfVisibleWidth, minX), maxX)
        cameraNode.position = CGPoint(x: clampedX, y: 0)
    }

    // MARK: - Update Loop

    override func update(_ currentTime: TimeInterval) {
        if lastUpdateTime == 0 {
            lastUpdateTime = currentTime
        }
        let delta = min(CGFloat(currentTime - lastUpdateTime), GameConstants.maxDeltaTime)
        lastUpdateTime = currentTime

        guard !isPaused else { return }

        // Phase 2+: player update, physics, entities, etc.
        // For now, just update camera
        updateCameraPosition()

        // Parallax offset (0.3x speed)
        updateParallax()
    }

    private func updateParallax() {
        backgroundNode.enumerateChildNodes(withName: "parallax_*") { node, _ in
            // Parallax will be implemented properly in Phase 3 with camera movement
        }
    }

    // MARK: - Public API for SwiftUI

    func restartCurrentLevel() {
        buildLevel(biome: currentBiome)
    }

    func answerDuel(index: Int) {
        // Phase 4: handle duel answer
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
