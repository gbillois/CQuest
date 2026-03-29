import SpriteKit

/// Loads and caches textures from the bundled WebApp/game_assets folder.
/// All textures use nearest-neighbor filtering for pixel-art crispness.
final class AssetManager {
    static let shared = AssetManager()
    private var textureCache: [String: SKTexture] = [:]
    private var missingPaths: Set<String> = []

    private init() {}

    /// Returns a cached texture for the given asset path (relative to WebApp/).
    /// Example: texture(for: "game_assets/heroes/paladin/rotations/south-east.png")
    func texture(for relativePath: String) -> SKTexture? {
        if let cached = textureCache[relativePath] {
            return cached
        }
        if missingPaths.contains(relativePath) {
            return nil
        }

        // Try loading from the WebApp bundle folder
        if let bundlePath = Bundle.main.path(forResource: relativePath, ofType: nil, inDirectory: "WebApp") {
            let image = UIImage(contentsOfFile: bundlePath)
            if let image = image {
                let tex = SKTexture(image: image)
                tex.filteringMode = .nearest
                textureCache[relativePath] = tex
                return tex
            }
        }

        // Try without the WebApp prefix (in case assets are at root of bundle)
        if let bundlePath = Bundle.main.path(forResource: relativePath, ofType: nil) {
            let image = UIImage(contentsOfFile: bundlePath)
            if let image = image {
                let tex = SKTexture(image: image)
                tex.filteringMode = .nearest
                textureCache[relativePath] = tex
                return tex
            }
        }

        missingPaths.insert(relativePath)
        return nil
    }

    /// Preloads an array of texture paths into the cache.
    func preload(_ paths: [String], completion: @escaping () -> Void = {}) {
        let textures = paths.compactMap { texture(for: $0) }
        SKTexture.preload(textures, withCompletionHandler: completion)
    }

    /// Returns a colored placeholder texture when an asset is missing.
    func placeholderTexture(size: CGSize = CGSize(width: 64, height: 64), color: UIColor = .magenta) -> SKTexture {
        let renderer = UIGraphicsImageRenderer(size: size)
        let image = renderer.image { ctx in
            color.withAlphaComponent(0.5).setFill()
            ctx.fill(CGRect(origin: .zero, size: size))
            UIColor.white.setStroke()
            let rect = CGRect(origin: .zero, size: size).insetBy(dx: 1, dy: 1)
            ctx.stroke(rect)
            // Draw X
            ctx.cgContext.move(to: .zero)
            ctx.cgContext.addLine(to: CGPoint(x: size.width, y: size.height))
            ctx.cgContext.move(to: CGPoint(x: size.width, y: 0))
            ctx.cgContext.addLine(to: CGPoint(x: 0, y: size.height))
            ctx.cgContext.strokePath()
        }
        let tex = SKTexture(image: image)
        tex.filteringMode = .nearest
        return tex
    }

    /// Clears the entire texture cache.
    func clearCache() {
        textureCache.removeAll()
        missingPaths.removeAll()
    }

    /// Number of cached textures.
    var cacheCount: Int { textureCache.count }
}
