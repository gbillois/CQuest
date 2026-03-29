import Foundation
import SpriteKit

/// Friendly animal entity — patrol + bounce behavior.
/// Ported from src/entities.js — identical patrol and bounce mechanics.
class AnimalNode: SKSpriteNode {

    // MARK: - Identity

    let animalId: String
    var spawnData: AnimalSpawn

    // MARK: - Physics State (Y-down world coordinates)

    var worldX: CGFloat = 0
    var worldY: CGFloat = 0
    var vx: CGFloat = 0
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

    // MARK: - Bounce State

    var bounceRewardClaimed: Bool = false

    // MARK: - Init

    init(animalId: String, spawn: AnimalSpawn) {
        self.animalId = animalId
        self.spawnData = spawn

        let placeholder = AssetManager.shared.placeholderTexture(
            size: CGSize(width: 48, height: 48), color: .green
        )
        super.init(texture: placeholder, color: .clear, size: CGSize(width: 48, height: 48))
        self.zPosition = 7

        worldX = spawn.x
        worldY = spawn.y
        dir = 1
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
        let config = AnimalNode.spriteConfig(for: animalId)

        hitboxWidth = config.hitboxW
        hitboxHeight = config.hitboxH

        let drawW = config.hitboxW
        let drawH = config.hitboxH
        self.size = CGSize(width: drawW, height: drawH)

        idleEastTex = assets.texture(for: config.idleE)
        idleWestTex = assets.texture(for: config.idleW)
        walkEastFrames = config.walkE.compactMap { assets.texture(for: $0) }
        walkWestFrames = config.walkW.compactMap { assets.texture(for: $0) }

        if let tex = idleEastTex {
            self.texture = tex
        }
    }

    // MARK: - Sprite Config Per Animal Type

    struct SpriteConfig {
        let idleE: String
        let idleW: String
        let walkE: [String]
        let walkW: [String]
        let hitboxW: CGFloat
        let hitboxH: CGFloat
    }

    static func spriteConfig(for animalId: String) -> SpriteConfig {
        // Default config — animals share similar structure
        let basePath = "game_assets/animals/\(animalId)"
        return SpriteConfig(
            idleE: "\(basePath)/east.png",
            idleW: "\(basePath)/west.png",
            walkE: (0..<4).map { "\(basePath)/walk_east/frame_\(String(format: "%03d", $0)).png" },
            walkW: (0..<4).map { "\(basePath)/walk_west/frame_\(String(format: "%03d", $0)).png" },
            hitboxW: 48,
            hitboxH: 48
        )
    }

    // MARK: - Update

    func update(delta: CGFloat, groundSurfaceY: CGFloat, worldWidth: CGFloat) {
        // Patrol movement at same speed as enemies
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

    // MARK: - Hitbox Rect (Y-down world coords)

    var hitboxRect: CGRect {
        CGRect(x: worldX, y: worldY, width: hitboxWidth, height: hitboxHeight)
    }
}
