import SpriteKit

/// Manages parallax background rendering.
/// Single layer at 0.3x camera speed, seamlessly looping with alternating mirroring.
class ParallaxBackground {
    private var sprites: [SKSpriteNode] = []
    private let parentNode: SKNode
    private let speed: CGFloat = 0.3
    private var drawWidth: CGFloat = 0
    private var drawHeight: CGFloat = 0

    init(parentNode: SKNode) {
        self.parentNode = parentNode
    }

    /// Set up the parallax background for a biome.
    func setup(biomeId: String, worldWidth: CGFloat, worldToScene: (CGFloat, CGFloat) -> CGPoint) {
        // Remove old
        sprites.forEach { $0.removeFromParent() }
        sprites.removeAll()

        guard let path = GameConstants.biomeParallaxBackgrounds[biomeId],
              let tex = AssetManager.shared.texture(for: path) else { return }

        let texSize = tex.size()
        let scale = max(
            GameConstants.virtualHeight / texSize.height,
            GameConstants.virtualWidth / texSize.width,
            1
        )
        drawWidth = texSize.width * scale
        drawHeight = texSize.height * scale

        // Create enough copies to cover the world plus buffer
        let copies = Int(ceil(worldWidth / drawWidth)) + 3
        for i in 0..<copies {
            let sprite = SKSpriteNode(texture: tex, size: CGSize(width: drawWidth, height: drawHeight))
            sprite.anchorPoint = CGPoint(x: 0, y: 1)
            sprite.zPosition = -50

            // Alternate mirroring for seamless tiling
            if i % 2 == 1 {
                sprite.xScale = -1
            }

            let baseX = CGFloat(i) * drawWidth
            let pos = worldToScene(baseX, 0)
            sprite.position = pos
            sprite.name = "parallax"

            parentNode.addChild(sprite)
            sprites.append(sprite)
        }
    }

    /// Update parallax positions based on camera X.
    func update(cameraX: CGFloat, worldWidth: CGFloat, worldToScene: (CGFloat, CGFloat) -> CGPoint) {
        guard drawWidth > 0 else { return }

        // Parallax offset: camera * speed
        let parallaxOffset = cameraX * speed

        for (i, sprite) in sprites.enumerated() {
            let baseX = CGFloat(i) * drawWidth - parallaxOffset.truncatingRemainder(dividingBy: drawWidth)
            // Wrap to keep sprites in view
            var adjustedX = baseX
            let totalWidth = drawWidth * CGFloat(sprites.count)
            while adjustedX < -drawWidth { adjustedX += totalWidth }
            while adjustedX > worldWidth + drawWidth { adjustedX -= totalWidth }

            let pos = worldToScene(adjustedX, 0)
            sprite.position = pos
        }
    }

    func removeAll() {
        sprites.forEach { $0.removeFromParent() }
        sprites.removeAll()
    }
}
