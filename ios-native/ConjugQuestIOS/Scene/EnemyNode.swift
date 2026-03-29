import Foundation
import SpriteKit

/// Enemy entity with patrol AI, stomp detection, and defeat animation.
/// Ported from src/entities.js — identical patrol speed and defeat timings.
class EnemyNode: SKSpriteNode {

    // MARK: - Identity

    let enemyId: String
    var spawnData: EnemySpawn

    // MARK: - Physics State (Y-down world coordinates)

    var worldX: CGFloat = 0
    var worldY: CGFloat = 0
    var vx: CGFloat = 0
    var vy: CGFloat = 0
    var dir: CGFloat = 1  // 1 = east, -1 = west

    // MARK: - Hitbox

    var hitboxWidth: CGFloat = 48
    var hitboxHeight: CGFloat = 48

    // MARK: - Patrol

    var patrolMin: CGFloat = 0
    var patrolMax: CGFloat = 0

    // MARK: - Animation

    var animTime: CGFloat = 0
    var walkEastFrames: [SKTexture] = []
    var walkWestFrames: [SKTexture] = []
    var idleEastTex: SKTexture?
    var idleWestTex: SKTexture?

    // MARK: - State

    var isAlive: Bool = true
    var defeatFadeActive: Bool = false
    var defeatFadeElapsed: CGFloat = 0
    var battling: Bool = false

    // MARK: - Init

    init(enemyId: String, spawn: EnemySpawn) {
        self.enemyId = enemyId
        self.spawnData = spawn

        let placeholder = AssetManager.shared.placeholderTexture(
            size: CGSize(width: 48, height: 48), color: .red
        )
        super.init(texture: placeholder, color: .clear, size: CGSize(width: 48, height: 48))
        self.zPosition = 8

        // Set up from spawn data
        worldX = spawn.x
        worldY = spawn.y
        dir = spawn.dir
        patrolMin = spawn.patrolMin
        patrolMax = spawn.patrolMax

        loadSprites()
    }

    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    // MARK: - Sprite Loading

    private func loadSprites() {
        let assets = AssetManager.shared
        let config = EnemyNode.spriteConfig(for: enemyId)

        hitboxWidth = config.hitboxW
        hitboxHeight = config.hitboxH

        let drawW = config.hitboxW * GameConstants.enemyScale
        let drawH = config.hitboxH * GameConstants.enemyScale
        self.size = CGSize(width: drawW, height: drawH)

        idleEastTex = assets.texture(for: config.idleE)
        idleWestTex = assets.texture(for: config.idleW)
        walkEastFrames = config.walkE.compactMap { assets.texture(for: $0) }
        walkWestFrames = config.walkW.compactMap { assets.texture(for: $0) }

        if let tex = dir >= 0 ? idleEastTex : idleWestTex {
            self.texture = tex
        }
    }

    // MARK: - Sprite Config Per Enemy Type

    struct SpriteConfig {
        let idleE: String
        let idleW: String
        let walkE: [String]
        let walkW: [String]
        let hitboxW: CGFloat
        let hitboxH: CGFloat
    }

    static func spriteConfig(for enemyId: String) -> SpriteConfig {
        switch enemyId {
        case "forest-wasp":
            return SpriteConfig(
                idleE: "game_assets/enemies/forest-wasp/east.png",
                idleW: "game_assets/enemies/forest-wasp/west.png",
                walkE: (0..<4).map { "game_assets/enemies/forest-wasp/walk_east/frame_\(String(format: "%03d", $0)).png" },
                walkW: (0..<4).map { "game_assets/enemies/forest-wasp/walk_west/frame_\(String(format: "%03d", $0)).png" },
                hitboxW: 64, hitboxH: 54
            )
        case "desert-scorpion":
            return SpriteConfig(
                idleE: "game_assets/enemies/desert-scorpion/east.png",
                idleW: "game_assets/enemies/desert-scorpion/west.png",
                walkE: (0..<4).map { "game_assets/enemies/desert-scorpion/walk_east/frame_\(String(format: "%03d", $0)).png" },
                walkW: (0..<4).map { "game_assets/enemies/desert-scorpion/walk_west/frame_\(String(format: "%03d", $0)).png" },
                hitboxW: 72, hitboxH: 48
            )
        case "mountain-snake":
            return SpriteConfig(
                idleE: "game_assets/enemies/mountain-snake/east.png",
                idleW: "game_assets/enemies/mountain-snake/west.png",
                walkE: (0..<4).map { "game_assets/enemies/mountain-snake/walk_east/frame_\(String(format: "%03d", $0)).png" },
                walkW: (0..<4).map { "game_assets/enemies/mountain-snake/walk_west/frame_\(String(format: "%03d", $0)).png" },
                hitboxW: 64, hitboxH: 48
            )
        case "snow-fox":
            return SpriteConfig(
                idleE: "game_assets/enemies/snow-fox/east.png",
                idleW: "game_assets/enemies/snow-fox/west.png",
                walkE: (0..<4).map { "game_assets/enemies/snow-fox/walk_east/frame_\(String(format: "%03d", $0)).png" },
                walkW: (0..<4).map { "game_assets/enemies/snow-fox/walk_west/frame_\(String(format: "%03d", $0)).png" },
                hitboxW: 64, hitboxH: 52
            )
        case "desolation-wolf":
            return SpriteConfig(
                idleE: "game_assets/enemies/desolation-wolf/east.png",
                idleW: "game_assets/enemies/desolation-wolf/west.png",
                walkE: (0..<4).map { "game_assets/enemies/desolation-wolf/walk_east/frame_\(String(format: "%03d", $0)).png" },
                walkW: (0..<4).map { "game_assets/enemies/desolation-wolf/walk_west/frame_\(String(format: "%03d", $0)).png" },
                hitboxW: 72, hitboxH: 56
            )
        default:
            return SpriteConfig(
                idleE: "game_assets/enemies/forest-wasp/east.png",
                idleW: "game_assets/enemies/forest-wasp/west.png",
                walkE: [],
                walkW: [],
                hitboxW: 48, hitboxH: 48
            )
        }
    }

    // MARK: - Update

    func update(delta: CGFloat, groundSurfaceY: CGFloat, worldWidth: CGFloat) {
        guard isAlive else {
            updateDefeatFade(delta: delta)
            return
        }

        // Patrol movement at 52px/s
        vx = dir * GameConstants.enemyMoveSpeed
        worldX += vx * delta

        // Reverse at patrol boundaries
        if worldX <= patrolMin {
            worldX = patrolMin
            dir = 1
        } else if worldX + hitboxWidth >= patrolMax {
            worldX = patrolMax - hitboxWidth
            dir = -1
        }

        // Reverse at world boundaries
        if worldX <= 0 {
            worldX = 0
            dir = 1
        } else if worldX + hitboxWidth >= worldWidth {
            worldX = worldWidth - hitboxWidth
            dir = -1
        }

        // Keep on ground
        worldY = groundSurfaceY - hitboxHeight

        // Update animation
        animTime += delta
        updateSpriteFrame()
    }

    private func updateSpriteFrame() {
        let facingEast = dir >= 0
        let walkSet = facingEast ? walkEastFrames : walkWestFrames
        let idle = facingEast ? idleEastTex : idleWestTex

        if !walkSet.isEmpty {
            let index = Int(animTime * 9) % walkSet.count
            self.texture = walkSet[index]
        } else if let idle = idle {
            self.texture = idle
        }
    }

    // MARK: - Defeat

    func defeat() {
        guard isAlive else { return }
        isAlive = false
        defeatFadeActive = true
        defeatFadeElapsed = 0
        battling = true
    }

    private func updateDefeatFade(delta: CGFloat) {
        guard defeatFadeActive else { return }
        defeatFadeElapsed += delta

        let progress = min(defeatFadeElapsed / GameConstants.enemyDefeatFadeSeconds, 1.0)
        self.alpha = 1 - progress

        // Rise upward during fade
        // Note: this is applied via position offset in the scene's update

        if progress >= 1 {
            defeatFadeActive = false
            self.removeFromParent()
        }
    }

    var defeatRiseOffset: CGFloat {
        guard defeatFadeActive else { return 0 }
        let progress = min(defeatFadeElapsed / GameConstants.enemyDefeatFadeSeconds, 1.0)
        return GameConstants.enemyDefeatRisePx * progress
    }

    // MARK: - Hitbox Rect (Y-down world coords)

    var hitboxRect: CGRect {
        CGRect(x: worldX, y: worldY, width: hitboxWidth, height: hitboxHeight)
    }
}
