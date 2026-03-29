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

        idleEastTex = assets.texture(for: config.idleE)
        idleWestTex = assets.texture(for: config.idleW)
        walkEastFrames = config.walkE.compactMap { assets.texture(for: $0) }
        walkWestFrames = config.walkW.compactMap { assets.texture(for: $0) }

        // Use actual texture size scaled by 1.5x for draw size
        if let tex = idleEastTex {
            self.texture = tex
            let texSize = tex.size()
            self.size = CGSize(
                width: texSize.width * GameConstants.enemyScale,
                height: texSize.height * GameConstants.enemyScale
            )
        } else {
            self.size = CGSize(width: config.hitboxW, height: config.hitboxH)
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
        let base = "game_assets/animals/\(animalId)"

        // Hitbox sizes from sprite-manifest.json (scaled 1.5x)
        let hitbox: (w: CGFloat, h: CGFloat)
        switch animalId {
        case "forest-goat":          hitbox = (53, 45)
        case "forest-sheep":         hitbox = (45, 39)
        case "forest-rabbit":        hitbox = (45, 38)
        case "desert-camel":         hitbox = (54, 39)
        case "desert-fennec":        hitbox = (32, 26)
        case "mountain-marmot":      hitbox = (30, 23)
        case "mountain-ibex":        hitbox = (45, 41)
        case "snow-reindeer":        hitbox = (50, 50)
        case "snow-otter":           hitbox = (33, 21)
        case "snow-rabbit":          hitbox = (44, 39)
        case "desolation-frog":      hitbox = (30, 23)
        case "desolation-earthworm": hitbox = (32, 23)
        default:                     hitbox = (40, 30)
        }

        return SpriteConfig(
            idleE: "\(base)/rotations/east.png",
            idleW: "\(base)/rotations/west.png",
            walkE: (0..<6).map { "\(base)/animations/walk-6-frames/east/frame_\(String(format: "%03d", $0)).png" },
            walkW: (0..<6).map { "\(base)/animations/walk-6-frames/west/frame_\(String(format: "%03d", $0)).png" },
            hitboxW: hitbox.w,
            hitboxH: hitbox.h
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
