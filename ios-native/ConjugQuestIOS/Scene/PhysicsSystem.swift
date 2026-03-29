import Foundation
import CoreGraphics

/// Custom AABB collision detection and resolution.
/// Ported from src/physics.js — does NOT use SpriteKit's physics engine.
/// All coordinates use the HTML convention: Y-down, origin at top-left.
enum PhysicsSystem {

    // MARK: - AABB Test

    /// Returns true if two rectangles overlap.
    static func aabb(_ a: CGRect, _ b: CGRect) -> Bool {
        a.minX < b.maxX && a.maxX > b.minX &&
        a.minY < b.maxY && a.maxY > b.minY
    }

    // MARK: - Resolve Horizontal Collisions

    /// Prevents entity from passing through solid tiles horizontally.
    /// Entity has: worldX, worldY (top-left), hitboxWidth, hitboxHeight, vx.
    static func resolveHorizontalCollisions(
        entityX: inout CGFloat,
        entityY: CGFloat,
        entityW: CGFloat,
        entityH: CGFloat,
        entityVx: inout CGFloat,
        solidRects: [CGRect],
        worldWidth: CGFloat
    ) {
        let entityRect = CGRect(x: entityX, y: entityY, width: entityW, height: entityH)

        for rect in solidRects {
            guard aabb(entityRect, rect) else { continue }

            if entityVx > 0 {
                // Moving right — push left
                entityX = rect.minX - entityW
            } else if entityVx < 0 {
                // Moving left — push right
                entityX = rect.maxX
            }
            entityVx = 0
        }

        // Clamp to world bounds
        entityX = max(0, min(entityX, worldWidth - entityW))
    }

    // MARK: - Resolve Vertical Collisions

    /// Prevents entity from falling through ground or jumping into ceilings.
    /// Returns true if entity is on ground after resolution.
    @discardableResult
    static func resolveVerticalCollisions(
        entityX: CGFloat,
        entityY: inout CGFloat,
        entityW: CGFloat,
        entityH: CGFloat,
        entityVy: inout CGFloat,
        solidRects: [CGRect],
        oneWayRects: [CGRect] = [],
        previousY: CGFloat
    ) -> Bool {
        var onGround = false
        let entityRect = CGRect(x: entityX, y: entityY, width: entityW, height: entityH)

        // Check solid (full) colliders
        for rect in solidRects {
            guard aabb(entityRect, rect) else { continue }

            if entityVy > 0 {
                // Falling down — land on top
                entityY = rect.minY - entityH
                entityVy = 0
                onGround = true
            } else if entityVy < 0 {
                // Jumping up — hit ceiling
                entityY = rect.maxY
                entityVy = 0
            }
        }

        // Check one-way platforms (only collide from above)
        for rect in oneWayRects {
            let prevBottom = previousY + entityH

            // Only collide if:
            // 1. Entity is falling (vy > 0)
            // 2. Entity was above the platform last frame
            // 3. Entity is now overlapping
            guard entityVy > 0,
                  prevBottom <= rect.minY + 4,  // Was above (with small tolerance)
                  aabb(CGRect(x: entityX, y: entityY, width: entityW, height: entityH), rect)
            else { continue }

            entityY = rect.minY - entityH
            entityVy = 0
            onGround = true
        }

        return onGround
    }

    // MARK: - Get Ground Surface Rects

    /// Builds collision rectangles for the ground at the given Y position.
    /// groundSurfaceY: Y position of ground surface (Y-down).
    /// tileSize: size of each tile.
    /// worldWidthTiles: number of tiles across.
    /// holes: array of (startTile, endTile) gaps in the ground.
    static func buildGroundRects(
        groundSurfaceY: CGFloat,
        tileSize: CGFloat,
        worldWidthTiles: Int,
        holes: [(start: Int, end: Int)] = []
    ) -> [CGRect] {
        var rects: [CGRect] = []
        var col = 0
        while col < worldWidthTiles {
            // Check if this column is in a hole
            var inHole = false
            for hole in holes {
                if col >= hole.start && col < hole.end {
                    col = hole.end
                    inHole = true
                    break
                }
            }
            if inHole { continue }

            // Find continuous ground span
            let spanStart = col
            var spanEnd = col + 1
            while spanEnd < worldWidthTiles {
                var nextInHole = false
                for hole in holes {
                    if spanEnd >= hole.start && spanEnd < hole.end {
                        nextInHole = true
                        break
                    }
                }
                if nextInHole { break }
                spanEnd += 1
            }

            // Create rect for this span
            let x = CGFloat(spanStart) * tileSize
            let w = CGFloat(spanEnd - spanStart) * tileSize
            rects.append(CGRect(x: x, y: groundSurfaceY, width: w, height: tileSize * 4))

            col = spanEnd
        }

        return rects
    }

    // MARK: - Get Nearby Solid Rects

    /// Returns collision rects near the entity position (optimization: only check nearby tiles).
    static func getNearbySolidRects(
        entityX: CGFloat,
        entityY: CGFloat,
        entityW: CGFloat,
        entityH: CGFloat,
        tileSize: CGFloat,
        groundRects: [CGRect],
        platformRects: [CGRect]
    ) -> [CGRect] {
        // For now, return all rects. Phase 3 will optimize with spatial lookup.
        return groundRects
    }

    /// Returns nearby one-way platform rects.
    static func getNearbyOneWayRects(
        entityX: CGFloat,
        entityY: CGFloat,
        entityW: CGFloat,
        entityH: CGFloat,
        tileSize: CGFloat,
        platformRects: [CGRect]
    ) -> [CGRect] {
        return platformRects
    }
}
