import Foundation
import SpriteKit

/// Player character node with custom physics state and sprite animations.
/// All physics values match the HTML game exactly for identical feel.
class PlayerNode: SKSpriteNode {

    // MARK: - Physics State (custom — NOT SpriteKit physics)
    var vx: CGFloat = 0
    var vy: CGFloat = 0
    var onGround: Bool = false
    var facing: String = "south-east"  // "south-east" or "south-west"
    var animTime: CGFloat = 0

    // MARK: - Jump Mechanics
    var coyoteTimeLeft: CGFloat = 0
    var jumpBufferTimeLeft: CGFloat = 0
    var jumpHeld: Bool = false
    var wasOnGround: Bool = false

    // MARK: - Damage State
    var invulnTimeLeft: CGFloat = 0
    var stunTimeLeft: CGFloat = 0
    var isDead: Bool = false

    // MARK: - Hitbox (collision box, smaller than sprite)
    var hitboxWidth: CGFloat = GameConstants.playerHitboxWidth   // 28
    var hitboxHeight: CGFloat = GameConstants.playerHitboxHeight  // 120

    // MARK: - World Position (separate from node position for physics)
    /// worldX/worldY represent the top-left of the hitbox in world coordinates (Y-down like HTML).
    /// The sprite node position is derived from these.
    var worldX: CGFloat = 0
    var worldY: CGFloat = 0

    // MARK: - Sprite Data
    struct HeroSprites {
        var idleSE: SKTexture?
        var idleSW: SKTexture?
        var runSE: [SKTexture] = []
        var runSW: [SKTexture] = []
        var jumpSE: [SKTexture] = []
        var jumpSW: [SKTexture] = []
    }

    var heroSprites = HeroSprites()
    var heroId: String = "paladin"
    var spriteDrawSize: CGSize = CGSize(width: 64, height: 64)

    // MARK: - Init

    init() {
        let placeholder = AssetManager.shared.placeholderTexture(
            size: CGSize(width: 64, height: 64), color: .blue
        )
        super.init(texture: placeholder, color: .clear, size: CGSize(width: 64, height: 64))
        self.zPosition = 10
    }

    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    // MARK: - Load Hero Sprites

    func loadHero(id: String) {
        heroId = id
        let assets = AssetManager.shared

        // Map hero ID to directory name
        let dirMap: [String: String] = [
            "paladin": "paladin", "ninja": "ninja", "pirate": "pirate", "mage": "mage",
            "barbarian": "Barbarian", "catwarrior": "CatWarrior", "golem": "Golem", "knight": "Knight",
        ]
        let dir = dirMap[id.lowercased()] ?? "paladin"
        let base = "game_assets/heroes/\(dir)"

        // Idle sprites
        heroSprites.idleSE = assets.texture(for: "\(base)/rotations/south-east.png")
        heroSprites.idleSW = assets.texture(for: "\(base)/rotations/south-west.png")

        // Run animation frames (try up to 8 frames)
        heroSprites.runSE = loadFrames(base: "\(base)/animations/running/south-east/frame_", count: 8)
        heroSprites.runSW = loadFrames(base: "\(base)/animations/running/south-west/frame_", count: 8)

        // Jump animation frames
        heroSprites.jumpSE = loadFrames(base: "\(base)/animations/jumping/south-east/frame_", count: 8)
        heroSprites.jumpSW = loadFrames(base: "\(base)/animations/jumping/south-west/frame_", count: 8)

        // If no jump frames, fall back to run frames
        if heroSprites.jumpSE.isEmpty { heroSprites.jumpSE = heroSprites.runSE }
        if heroSprites.jumpSW.isEmpty { heroSprites.jumpSW = heroSprites.runSW }

        // Apply hero-specific hitbox overrides
        if let override = GameConstants.heroHitboxOverrides[id.lowercased()] {
            if let w = override.w { hitboxWidth = w }
            if let h = override.h { hitboxHeight = h }
        }

        // Set initial texture
        if let tex = heroSprites.idleSE {
            self.texture = tex
            let texSize = tex.size()
            let scale = GameConstants.heroScale
            spriteDrawSize = CGSize(width: texSize.width * scale, height: texSize.height * scale)
            self.size = spriteDrawSize
        }
    }

    private func loadFrames(base: String, count: Int) -> [SKTexture] {
        var frames: [SKTexture] = []
        for i in 0..<count {
            let path = "\(base)\(String(format: "%03d", i)).png"
            if let tex = AssetManager.shared.texture(for: path) {
                frames.append(tex)
            }
        }
        return frames
    }

    // MARK: - Animation Frame Selection

    /// Pick the right animation frame based on current state. Matches HTML exactly:
    /// - Jump: 12fps, priority when not on ground
    /// - Run: 11fps, when |vx| > 8
    /// - Idle: static frame otherwise
    func updateSprite(delta: CGFloat) {
        animTime += delta

        let facingSE = facing == "south-east"

        if !onGround {
            // Jump/fall animation at 12fps
            let jumpSet = facingSE ? heroSprites.jumpSE : heroSprites.jumpSW
            if !jumpSet.isEmpty {
                let index = Int(animTime * 12) % jumpSet.count
                self.texture = jumpSet[index]
                self.size = spriteDrawSize
                return
            }
        }

        if abs(vx) > 8 {
            // Run animation at 11fps
            let runSet = facingSE ? heroSprites.runSE : heroSprites.runSW
            if !runSet.isEmpty {
                let index = Int(animTime * 11) % runSet.count
                self.texture = runSet[index]
                self.size = spriteDrawSize
                return
            }
        }

        // Idle
        let idleTex = facingSE ? heroSprites.idleSE : heroSprites.idleSW
        if let tex = idleTex {
            self.texture = tex
            self.size = spriteDrawSize
        }
    }

    // MARK: - Invulnerability Blink

    func updateBlink(delta: CGFloat) {
        if invulnTimeLeft > 0 {
            invulnTimeLeft -= delta
            // Blink at 14Hz
            let blinkOn = Int(invulnTimeLeft * GameConstants.playerHitBlinkHz) % 2 == 0
            self.alpha = blinkOn ? 1.0 : 0.3
        } else {
            self.alpha = 1.0
        }

        if stunTimeLeft > 0 {
            stunTimeLeft -= delta
        }
    }

    // MARK: - Hitbox Rect (in world coordinates, Y-down)

    var hitboxRect: CGRect {
        CGRect(x: worldX, y: worldY, width: hitboxWidth, height: hitboxHeight)
    }
}
