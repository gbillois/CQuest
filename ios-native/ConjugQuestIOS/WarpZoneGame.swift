import SwiftUI
import SpriteKit
import UIKit

struct WarpZoneQuestion: Identifiable, Equatable {
    let id = UUID()
    let prompt: String
    let answers: [String]
    let correctAnswerIndex: Int
    let successMessage: String
    let failureMessage: String
}

@MainActor
final class WarpZoneGameViewModel: ObservableObject {
    @Published var hearts: Int = 3
    @Published var maxHearts: Int = 5
    @Published var coins: Int = 0
    @Published var currentBiomeName: String = "Forêt"
    @Published var currentObjective: String = "Traverse le portail suivant."
    @Published var currentQuestion: WarpZoneQuestion?
    @Published var statusMessage: String = "Warp Zone native initialisée"
    @Published var canRestart: Bool = false
    @Published var isVictory: Bool = false

    fileprivate weak var scene: WarpZoneScene?

    func attach(scene: WarpZoneScene) {
        self.scene = scene
        refreshFromScene(scene)
    }

    func refreshFromScene(_ scene: WarpZoneScene) {
        hearts = scene.hearts
        maxHearts = scene.maxHearts
        coins = scene.coins
        currentBiomeName = scene.currentBiomeName
        currentObjective = scene.currentObjective
        canRestart = scene.canRestart
        isVictory = scene.isVictory
    }

    func setStatus(_ text: String) {
        statusMessage = text
    }

    func show(question: WarpZoneQuestion) {
        currentQuestion = question
    }

    func clearQuestion() {
        currentQuestion = nil
    }

    func setMovingLeft(_ isActive: Bool) {
        scene?.setMovingLeft(isActive)
    }

    func setMovingRight(_ isActive: Bool) {
        scene?.setMovingRight(isActive)
    }

    func jump() {
        scene?.jump()
    }

    func answer(_ index: Int) {
        scene?.submitAnswer(index)
    }

    func restart() {
        scene?.restartGame()
    }
}

struct WarpZoneGameView: View {
    private let controlsBottomOffset: CGFloat = 150
    private let gameAreaBottomOffset: CGFloat = 200

    @Binding var isPresented: Bool
    @StateObject private var viewModel = WarpZoneGameViewModel()
    @State private var spriteScene = WarpZoneScene(size: CGSize(width: 768, height: 1366))

    var body: some View {
        ZStack {
            SpriteView(scene: spriteScene)
                .ignoresSafeArea()
                .padding(.bottom, gameAreaBottomOffset)
                .onAppear {
                    spriteScene.scaleMode = .resizeFill
                    spriteScene.bind(to: viewModel)
                }
                .onDisappear {
                    spriteScene.teardownInput()
                }

            VStack(spacing: 0) {
                header
                Spacer()
                controls
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)
            .padding(.bottom, controlsBottomOffset)

            if let question = viewModel.currentQuestion {
                questionOverlay(question)
            }

            if viewModel.canRestart {
                restartOverlay
            }
        }
        .background(Color.black)
        .statusBarHidden(true)
    }

    private var header: some View {
        VStack(spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Warp Zone")
                        .font(.system(size: 28, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                    Text(viewModel.currentBiomeName)
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(Color(red: 1.0, green: 0.86, blue: 0.45))
                    Text(viewModel.currentObjective)
                        .font(.system(size: 13, weight: .medium, design: .rounded))
                        .foregroundStyle(.white.opacity(0.86))
                        .multilineTextAlignment(.leading)
                }
                Spacer()
                Button {
                    isPresented = false
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 30))
                        .foregroundStyle(.white.opacity(0.95))
                        .shadow(radius: 6)
                }
            }

            HStack(spacing: 12) {
                infoChip(label: "Vie", value: String(repeating: "♥", count: max(0, viewModel.hearts)))
                infoChip(label: "Pièces", value: "\(viewModel.coins)")
                infoChip(label: "État", value: viewModel.isVictory ? "Victoire" : "En cours")
            }

            Text(viewModel.statusMessage)
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .frame(maxWidth: .infinity)
                .background(.black.opacity(0.34), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
    }

    private func infoChip(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased())
                .font(.system(size: 10, weight: .heavy, design: .rounded))
                .foregroundStyle(.white.opacity(0.72))
            Text(value)
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var controls: some View {
        HStack(alignment: .bottom) {
            HStack(spacing: 18) {
                HoldButton(systemImage: "arrow.left.circle.fill", label: "Gauche") { isActive in
                    viewModel.setMovingLeft(isActive)
                }
                HoldButton(systemImage: "arrow.right.circle.fill", label: "Droite") { isActive in
                    viewModel.setMovingRight(isActive)
                }
            }

            Spacer()

            Button {
                viewModel.jump()
            } label: {
                VStack(spacing: 8) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 66))
                    Text("Saut")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(.black.opacity(0.32), in: RoundedRectangle(cornerRadius: 22, style: .continuous))
            }
            .buttonStyle(.plain)
        }
    }

    private func questionOverlay(_ question: WarpZoneQuestion) -> some View {
        Color.black.opacity(0.55)
            .ignoresSafeArea()
            .overlay {
                VStack(spacing: 18) {
                    Text("Portail de conjugaison")
                        .font(.system(size: 24, weight: .black, design: .rounded))
                    Text(question.prompt)
                        .font(.system(size: 18, weight: .semibold, design: .rounded))
                        .multilineTextAlignment(.center)
                    VStack(spacing: 10) {
                        ForEach(Array(question.answers.enumerated()), id: \.offset) { index, answer in
                            Button {
                                viewModel.answer(index)
                            } label: {
                                Text(answer)
                                    .font(.system(size: 17, weight: .bold, design: .rounded))
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 14)
                                    .frame(maxWidth: .infinity)
                                    .background(Color(red: 0.17, green: 0.22, blue: 0.34), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(24)
                .frame(maxWidth: 460)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 28, style: .continuous))
                .padding(24)
            }
    }

    private var restartOverlay: some View {
        Color.black.opacity(0.35)
            .ignoresSafeArea()
            .overlay(alignment: .bottom) {
                VStack(spacing: 14) {
                    Text(viewModel.isVictory ? "Expédition réussie" : "Expédition interrompue")
                        .font(.system(size: 24, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                    Button(viewModel.isVictory ? "Rejouer" : "Réessayer") {
                        viewModel.restart()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color(red: 0.31, green: 0.53, blue: 0.95))
                }
                .padding(24)
            }
    }
}

private struct HoldButton: View {
    let systemImage: String
    let label: String
    let onChange: (Bool) -> Void

    var body: some View {
        Image(systemName: systemImage)
            .font(.system(size: 66))
            .foregroundStyle(.white)
            .padding(10)
            .background(.black.opacity(0.32), in: RoundedRectangle(cornerRadius: 22, style: .continuous))
            .overlay(alignment: .bottom) {
                Text(label)
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.bottom, -24)
            }
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in onChange(true) }
                    .onEnded { _ in onChange(false) }
            )
    }
}

private struct WarpBiomeDefinition {
    let id: String
    let name: String
    let backgroundPath: String
    let groundTilePath: String
    let enemyTexturePath: String
    let accentColor: UIColor
    let question: WarpZoneQuestion
}

private final class WarpPortalNode: SKSpriteNode {
    let biomeIndex: Int
    let question: WarpZoneQuestion
    var isUnlocked = false

    init(biomeIndex: Int, question: WarpZoneQuestion, texture: SKTexture?) {
        self.biomeIndex = biomeIndex
        self.question = question
        let resolvedTexture = texture ?? SKTexture(image: UIImage(systemName: "sparkles.rectangle.stack.fill")!)
        super.init(texture: resolvedTexture, color: .clear, size: CGSize(width: 130, height: 190))
        name = "portal-\(biomeIndex)"
        colorBlendFactor = 0
    }

    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}

private final class EnemyNode: SKSpriteNode {
    let biomeIndex: Int
    var hasBeenDefeated = false

    init(biomeIndex: Int, texture: SKTexture?) {
        self.biomeIndex = biomeIndex
        let resolvedTexture = texture ?? SKTexture(image: UIImage(systemName: "flame.fill")!)
        super.init(texture: resolvedTexture, color: .clear, size: CGSize(width: 92, height: 92))
        name = "enemy-\(biomeIndex)"
    }

    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}

final class WarpZoneScene: SKScene, SKPhysicsContactDelegate {
    private enum PhysicsCategory {
        static let none: UInt32 = 0
        static let player: UInt32 = 1 << 0
        static let world: UInt32 = 1 << 1
        static let coin: UInt32 = 1 << 2
        static let portal: UInt32 = 1 << 3
        static let enemy: UInt32 = 1 << 4
        static let heart: UInt32 = 1 << 5
    }

    private(set) var hearts = 3
    private(set) var maxHearts = 5
    private(set) var coins = 0
    private(set) var currentBiomeName = "Forêt"
    private(set) var currentObjective = "Traverse le portail suivant."
    private(set) var canRestart = false
    private(set) var isVictory = false

    private weak var viewModel: WarpZoneGameViewModel?
    private let worldNode = SKNode()
    private let cameraNode = SKCameraNode()
    private var player = SKSpriteNode(color: .white, size: CGSize(width: 110, height: 110))
    private var playerIdleTexture: SKTexture?
    private var runRightTextures: [SKTexture] = []
    private var runLeftTextures: [SKTexture] = []
    private var jumpRightTextures: [SKTexture] = []
    private var jumpLeftTextures: [SKTexture] = []
    private var currentPortal: WarpPortalNode?
    private var groundContacts = 0
    private var movingLeft = false
    private var movingRight = false
    private var pendingJump = false
    private var lastUpdateTime: TimeInterval = 0
    private var levelWidth: CGFloat = 0
    private let segmentWidth: CGFloat = 1180
    private let tileSize: CGFloat = 64
    private let baseGroundY: CGFloat = 260
    private var hasBoundViewModel = false
    private var lastDamageTime: TimeInterval = 0

    private lazy var biomes: [WarpBiomeDefinition] = [
        WarpBiomeDefinition(
            id: "forest",
            name: "Forêt d'ouverture",
            backgroundPath: "game_assets/backgrounds/forest-background.png",
            groundTilePath: "game_assets/tiles/forest/forest_tile_r01_c01_01.png",
            enemyTexturePath: "game_assets/enemies/forest-goblin-green/rotations/east.png",
            accentColor: UIColor(red: 0.35, green: 0.69, blue: 0.42, alpha: 1),
            question: WarpZoneQuestion(prompt: "Présent — nous (aller)", answers: ["allons", "allez", "vont"], correctAnswerIndex: 0, successMessage: "Le portail forestier s'ouvre.", failureMessage: "Presque. La forêt se referme sur toi.")
        ),
        WarpBiomeDefinition(
            id: "desert",
            name: "Faille du désert",
            backgroundPath: "game_assets/backgrounds/desert-background.png",
            groundTilePath: "game_assets/tiles/desert/desert_tile_r01_c01_01.png",
            enemyTexturePath: "game_assets/enemies/desert-scorpion/rotations/east.png",
            accentColor: UIColor(red: 0.89, green: 0.64, blue: 0.24, alpha: 1),
            question: WarpZoneQuestion(prompt: "Imparfait — je (faire)", answers: ["faisais", "fais", "ferai"], correctAnswerIndex: 0, successMessage: "Le sable se plie à ta réponse.", failureMessage: "Le portail reste scellé dans le sable.")
        ),
        WarpBiomeDefinition(
            id: "mountain",
            name: "Arête montagneuse",
            backgroundPath: "game_assets/backgrounds/moutain-background.png",
            groundTilePath: "game_assets/tiles/mountain/mountain_tile_r01_c01_01.png",
            enemyTexturePath: "game_assets/enemies/mountain-troll/rotations/east.png",
            accentColor: UIColor(red: 0.42, green: 0.56, blue: 0.79, alpha: 1),
            question: WarpZoneQuestion(prompt: "Futur — ils (venir)", answers: ["viendront", "venaient", "viennent"], correctAnswerIndex: 0, successMessage: "La crête répond à ton futur.", failureMessage: "La montagne exige une meilleure conjugaison.")
        ),
        WarpBiomeDefinition(
            id: "snow",
            name: "Couloir des neiges",
            backgroundPath: "game_assets/backgrounds/snow-background.png",
            groundTilePath: "game_assets/tiles/snow/snow_tile_r01_c01_01.png",
            enemyTexturePath: "game_assets/enemies/snow-yeti/rotations/east.png",
            accentColor: UIColor(red: 0.69, green: 0.84, blue: 0.98, alpha: 1),
            question: WarpZoneQuestion(prompt: "Passé composé — elle (prendre)", answers: ["a pris", "prend", "prenait"], correctAnswerIndex: 0, successMessage: "Le givre s'efface devant toi.", failureMessage: "Le gel du portail t'arrête net.")
        ),
        WarpBiomeDefinition(
            id: "desolation",
            name: "Citadelle en désolation",
            backgroundPath: "game_assets/backgrounds/desolation-background.png",
            groundTilePath: "game_assets/tiles/desolation/desolation_tile_r01_c01_01.png",
            enemyTexturePath: "game_assets/enemies/desolation-skeleton/rotations/east.png",
            accentColor: UIColor(red: 0.66, green: 0.42, blue: 0.77, alpha: 1),
            question: WarpZoneQuestion(prompt: "Conditionnel — vous (pouvoir)", answers: ["pourriez", "pouvez", "pourrez"], correctAnswerIndex: 0, successMessage: "La dernière porte cède enfin.", failureMessage: "La citadelle réclame une réponse plus précise.")
        ),
    ]

    override init(size: CGSize) {
        super.init(size: size)
        scaleMode = .resizeFill
    }

    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func bind(to viewModel: WarpZoneGameViewModel) {
        self.viewModel = viewModel
        if hasBoundViewModel { return }
        hasBoundViewModel = true
        viewModel.attach(scene: self)
    }

    override func didMove(to view: SKView) {
        backgroundColor = .black
        physicsWorld.gravity = CGVector(dx: 0, dy: -22)
        physicsWorld.contactDelegate = self
        anchorPoint = CGPoint(x: 0.5, y: 0.5)
        buildSceneIfNeeded()
    }

    func teardownInput() {
        movingLeft = false
        movingRight = false
        pendingJump = false
    }

    private func buildSceneIfNeeded() {
        guard worldNode.parent == nil else { return }
        removeAllChildren()
        addChild(worldNode)
        camera = cameraNode
        addChild(cameraNode)
        loadTextures()
        resetState()
        constructWorld()
        configurePlayer()
        updateCameraPosition()
        syncHud()
        viewModel?.setStatus("Version native SpriteKit chargée")
    }

    private func resetState() {
        worldNode.removeAllChildren()
        removeAction(forKey: "damage-flash")
        hearts = 3
        coins = 0
        currentBiomeName = biomes.first?.name ?? "Warp Zone"
        currentObjective = "Traverse le portail suivant."
        canRestart = false
        isVictory = false
        groundContacts = 0
        movingLeft = false
        movingRight = false
        pendingJump = false
        currentPortal = nil
        lastDamageTime = 0
        lastUpdateTime = 0
    }

    func restartGame() {
        resetState()
        constructWorld()
        configurePlayer()
        viewModel?.clearQuestion()
        syncHud()
        viewModel?.setStatus("Nouvelle traversée générée")
    }

    private func constructWorld() {
        levelWidth = CGFloat(biomes.count) * segmentWidth
        let startX = -levelWidth * 0.5

        for (index, biome) in biomes.enumerated() {
            let segmentOriginX = startX + CGFloat(index) * segmentWidth
            addBackground(for: biome, segmentOriginX: segmentOriginX)
            addGround(for: biome, segmentOriginX: segmentOriginX)
            addPlatforms(for: biome, segmentOriginX: segmentOriginX, index: index)
            addCollectibles(for: biome, segmentOriginX: segmentOriginX, index: index)
            addEnemy(for: biome, segmentOriginX: segmentOriginX, index: index)
            addPortalIfNeeded(for: biome, segmentOriginX: segmentOriginX, index: index)
        }

        addStartTower(x: startX + 100)
        addFinishTower(x: startX + levelWidth - 120)
    }

    private func loadTextures() {
        playerIdleTexture = texture(path: "game_assets/heroes/pirate/rotations/south.png")
        runRightTextures = textureSequence(pathPrefix: "game_assets/heroes/pirate/animations/running-6-frames/south-east", frameCount: 6)
        runLeftTextures = textureSequence(pathPrefix: "game_assets/heroes/pirate/animations/running-6-frames/south-west", frameCount: 6)
        jumpRightTextures = textureSequence(pathPrefix: "game_assets/heroes/pirate/animations/jumping-2/south-east", frameCount: 8)
        jumpLeftTextures = textureSequence(pathPrefix: "game_assets/heroes/pirate/animations/jumping-2/south-west", frameCount: 8)
    }

    private func configurePlayer() {
        player.removeFromParent()
        player = SKSpriteNode(texture: playerIdleTexture, color: .clear, size: CGSize(width: 120, height: 120))
        player.name = "player"
        player.position = CGPoint(x: -levelWidth * 0.5 + 130, y: baseGroundY + 190)
        player.zPosition = 50
        let body = SKPhysicsBody(rectangleOf: CGSize(width: 58, height: 98), center: CGPoint(x: 0, y: -8))
        body.allowsRotation = false
        body.restitution = 0
        body.friction = 0.2
        body.linearDamping = 0.2
        body.categoryBitMask = PhysicsCategory.player
        body.collisionBitMask = PhysicsCategory.world
        body.contactTestBitMask = PhysicsCategory.world | PhysicsCategory.coin | PhysicsCategory.portal | PhysicsCategory.enemy | PhysicsCategory.heart
        body.usesPreciseCollisionDetection = true
        player.physicsBody = body
        worldNode.addChild(player)
    }

    private func addBackground(for biome: WarpBiomeDefinition, segmentOriginX: CGFloat) {
        let centerX = segmentOriginX + segmentWidth * 0.5
        let backgroundNode = SKSpriteNode(texture: texture(path: biome.backgroundPath), color: biome.accentColor, size: CGSize(width: segmentWidth + 40, height: size.height + 180))
        backgroundNode.position = CGPoint(x: centerX, y: 0)
        backgroundNode.zPosition = -100
        backgroundNode.alpha = 0.92
        if backgroundNode.texture == nil {
            backgroundNode.colorBlendFactor = 1
        }
        worldNode.addChild(backgroundNode)

        let tint = SKShapeNode(rectOf: CGSize(width: segmentWidth + 40, height: size.height + 180), cornerRadius: 0)
        tint.fillColor = biome.accentColor.withAlphaComponent(0.12)
        tint.strokeColor = .clear
        tint.position = backgroundNode.position
        tint.zPosition = -90
        worldNode.addChild(tint)
    }

    private func addGround(for biome: WarpBiomeDefinition, segmentOriginX: CGFloat) {
        let columns = Int(segmentWidth / tileSize)
        for column in 0..<columns {
            let x = segmentOriginX + CGFloat(column) * tileSize + tileSize * 0.5
            let ridge = sin(CGFloat(column) * 0.5) * 18 + CGFloat((column % 4) * 6)
            let columnTop = baseGroundY + ridge
            let columnHeight = max(220, size.height * 0.5 + ridge)
            let node = SKSpriteNode(texture: texture(path: biome.groundTilePath), color: biome.accentColor, size: CGSize(width: tileSize + 2, height: columnHeight))
            node.position = CGPoint(x: x, y: columnTop - columnHeight * 0.5)
            node.anchorPoint = CGPoint(x: 0.5, y: 0.5)
            node.zPosition = 0
            if node.texture == nil { node.colorBlendFactor = 1 }
            let body = SKPhysicsBody(rectangleOf: node.size)
            body.isDynamic = false
            body.categoryBitMask = PhysicsCategory.world
            body.contactTestBitMask = PhysicsCategory.player
            node.physicsBody = body
            worldNode.addChild(node)
        }
    }

    private func addPlatforms(for biome: WarpBiomeDefinition, segmentOriginX: CGFloat, index: Int) {
        let platformHeights: [CGFloat] = [baseGroundY + 180, baseGroundY + 280, baseGroundY + 220]
        let xOffsets: [CGFloat] = [260, 520, 820]
        for (platformIndex, offset) in xOffsets.enumerated() {
            let width = platformIndex == 1 ? 220.0 : 170.0
            let node = SKSpriteNode(texture: texture(path: biome.groundTilePath), color: biome.accentColor.withAlphaComponent(0.8), size: CGSize(width: width, height: 34))
            node.position = CGPoint(x: segmentOriginX + offset, y: platformHeights[(index + platformIndex) % platformHeights.count])
            node.zPosition = 6
            if node.texture == nil { node.colorBlendFactor = 1 }
            let body = SKPhysicsBody(rectangleOf: node.size)
            body.isDynamic = false
            body.friction = 0.8
            body.categoryBitMask = PhysicsCategory.world
            body.contactTestBitMask = PhysicsCategory.player
            node.physicsBody = body
            worldNode.addChild(node)
        }
    }

    private func addCollectibles(for biome: WarpBiomeDefinition, segmentOriginX: CGFloat, index: Int) {
        let coinTexture = texture(path: "game_assets/bonus/bonus_coin.png")
        let heartTexture = texture(path: "game_assets/bonus/bonus_heart.png")
        let heights: [CGFloat] = [baseGroundY + 330, baseGroundY + 380, baseGroundY + 300]
        for coinIndex in 0..<4 {
            let coin = SKSpriteNode(texture: coinTexture, color: .clear, size: CGSize(width: 44, height: 44))
            coin.name = "coin"
            coin.position = CGPoint(x: segmentOriginX + 210 + CGFloat(coinIndex) * 120, y: heights[(index + coinIndex) % heights.count])
            coin.zPosition = 20
            coin.physicsBody = SKPhysicsBody(circleOfRadius: 18)
            coin.physicsBody?.isDynamic = false
            coin.physicsBody?.categoryBitMask = PhysicsCategory.coin
            coin.physicsBody?.contactTestBitMask = PhysicsCategory.player
            coin.physicsBody?.collisionBitMask = PhysicsCategory.none
            worldNode.addChild(coin)
            coin.run(.repeatForever(.sequence([.scale(to: 1.05, duration: 0.6), .scale(to: 0.95, duration: 0.6)])))
        }

        if index == 1 || index == 3 {
            let heart = SKSpriteNode(texture: heartTexture, color: .clear, size: CGSize(width: 52, height: 52))
            heart.name = "heart"
            heart.position = CGPoint(x: segmentOriginX + 740, y: baseGroundY + 420)
            heart.zPosition = 20
            heart.physicsBody = SKPhysicsBody(circleOfRadius: 20)
            heart.physicsBody?.isDynamic = false
            heart.physicsBody?.categoryBitMask = PhysicsCategory.heart
            heart.physicsBody?.contactTestBitMask = PhysicsCategory.player
            heart.physicsBody?.collisionBitMask = PhysicsCategory.none
            worldNode.addChild(heart)
        }
    }

    private func addEnemy(for biome: WarpBiomeDefinition, segmentOriginX: CGFloat, index: Int) {
        let enemy = EnemyNode(biomeIndex: index, texture: texture(path: biome.enemyTexturePath))
        enemy.position = CGPoint(x: segmentOriginX + 620, y: baseGroundY + 82)
        enemy.zPosition = 22
        enemy.physicsBody = SKPhysicsBody(rectangleOf: CGSize(width: 62, height: 70), center: CGPoint(x: 0, y: -8))
        enemy.physicsBody?.isDynamic = false
        enemy.physicsBody?.categoryBitMask = PhysicsCategory.enemy
        enemy.physicsBody?.contactTestBitMask = PhysicsCategory.player
        enemy.physicsBody?.collisionBitMask = PhysicsCategory.none
        worldNode.addChild(enemy)

        let moveLeft = SKAction.moveBy(x: -120, y: 0, duration: 1.6)
        let moveRight = SKAction.moveBy(x: 120, y: 0, duration: 1.6)
        enemy.run(.repeatForever(.sequence([moveLeft, .scaleX(to: -1, duration: 0.1), moveRight, .scaleX(to: 1, duration: 0.1)])))
    }

    private func addPortalIfNeeded(for biome: WarpBiomeDefinition, segmentOriginX: CGFloat, index: Int) {
        let portalTexture = texture(path: "game_assets/decoration/deco_tower_gate.png") ?? texture(path: "game_assets/tower/tower_main.png")
        let portal = WarpPortalNode(biomeIndex: index, question: biome.question, texture: portalTexture)
        portal.position = CGPoint(x: segmentOriginX + segmentWidth - 120, y: baseGroundY + 102)
        portal.zPosition = 30
        portal.physicsBody = SKPhysicsBody(rectangleOf: CGSize(width: 92, height: 150))
        portal.physicsBody?.isDynamic = false
        portal.physicsBody?.categoryBitMask = PhysicsCategory.portal
        portal.physicsBody?.contactTestBitMask = PhysicsCategory.player
        portal.physicsBody?.collisionBitMask = PhysicsCategory.none
        worldNode.addChild(portal)

        let aura = SKShapeNode(circleOfRadius: 72)
        aura.fillColor = biome.accentColor.withAlphaComponent(0.2)
        aura.strokeColor = biome.accentColor.withAlphaComponent(0.7)
        aura.lineWidth = 3
        aura.position = .zero
        aura.zPosition = -1
        portal.addChild(aura)
        aura.run(.repeatForever(.sequence([.fadeAlpha(to: 0.25, duration: 0.8), .fadeAlpha(to: 0.8, duration: 0.8)])))
    }

    private func addStartTower(x: CGFloat) {
        let tower = SKSpriteNode(texture: texture(path: "game_assets/tower/tower_main.png"), color: .clear, size: CGSize(width: 220, height: 280))
        tower.position = CGPoint(x: x, y: baseGroundY + 120)
        tower.zPosition = 8
        worldNode.addChild(tower)
    }

    private func addFinishTower(x: CGFloat) {
        let tower = SKSpriteNode(texture: texture(path: "game_assets/tower/tower_main.png"), color: .clear, size: CGSize(width: 250, height: 310))
        tower.position = CGPoint(x: x, y: baseGroundY + 132)
        tower.zPosition = 8
        tower.color = .white
        worldNode.addChild(tower)
    }

    private func syncHud() {
        viewModel?.refreshFromScene(self)
    }

    func setMovingLeft(_ isActive: Bool) {
        movingLeft = isActive
    }

    func setMovingRight(_ isActive: Bool) {
        movingRight = isActive
    }

    func jump() {
        pendingJump = true
    }

    func submitAnswer(_ index: Int) {
        guard let portal = currentPortal else { return }
        let question = portal.question
        viewModel?.clearQuestion()
        isPaused = false
        if index == question.correctAnswerIndex {
            unlock(portal: portal)
            viewModel?.setStatus(question.successMessage)
            currentObjective = portal.biomeIndex == biomes.count - 1 ? "Atteins la tour finale." : "Continue jusqu'au portail suivant."
        } else {
            applyDamage(reason: question.failureMessage)
        }
        currentPortal = nil
        syncHud()
    }

    private func unlock(portal: WarpPortalNode) {
        portal.isUnlocked = true
        portal.physicsBody = nil
        portal.run(.sequence([.group([.fadeOut(withDuration: 0.35), .scale(to: 1.25, duration: 0.35)]), .removeFromParent()]))
        coins += 5
        if portal.biomeIndex == biomes.count - 1 {
            currentObjective = "La tour de sortie est ouverte."
        }
    }

    override func update(_ currentTime: TimeInterval) {
        let dt = lastUpdateTime == 0 ? 1.0 / 60.0 : min(1.0 / 30.0, currentTime - lastUpdateTime)
        lastUpdateTime = currentTime
        guard !canRestart else { return }

        updatePlayerMotion(deltaTime: CGFloat(dt))
        updateBiomeTracking()
        updateCameraPosition()
        updateVictoryState()
    }

    private func updatePlayerMotion(deltaTime: CGFloat) {
        guard let body = player.physicsBody else { return }
        let moveDirection: CGFloat = (movingRight ? 1 : 0) - (movingLeft ? 1 : 0)
        let targetVelocityX = moveDirection * 250
        body.velocity.dx += (targetVelocityX - body.velocity.dx) * min(1, deltaTime * 11)

        if pendingJump {
            if groundContacts > 0 {
                body.velocity.dy = 700
                groundContacts = max(0, groundContacts - 1)
                runJumpAnimation(facingRight: moveDirection >= 0)
            }
            pendingJump = false
        }

        if player.position.y < -size.height {
            applyDamage(reason: "Tu es tombé hors de la faille.")
            respawnNearCurrentBiome()
        }

        if groundContacts > 0 {
            if abs(body.velocity.dx) > 40 {
                runRunAnimation(facingRight: body.velocity.dx >= 0)
            } else {
                showIdleTexture()
            }
        }
    }

    private func updateBiomeTracking() {
        let startX = -levelWidth * 0.5
        let normalized = max(0, min(levelWidth - 1, player.position.x - startX))
        let index = min(biomes.count - 1, Int(normalized / segmentWidth))
        currentBiomeName = biomes[index].name
        if currentPortal == nil {
            currentObjective = index >= biomes.count - 1 ? "Atteins la tour finale." : "Trouve et active le portail du biome."
        }
        syncHud()
    }

    private func updateCameraPosition() {
        let halfVisibleWidth = size.width * 0.5
        let minX = -levelWidth * 0.5 + halfVisibleWidth
        let maxX = levelWidth * 0.5 - halfVisibleWidth
        let clampedX = min(max(player.position.x, minX), maxX)
        cameraNode.position = CGPoint(x: clampedX, y: 0)
    }

    private func updateVictoryState() {
        let finishX = levelWidth * 0.5 - 130
        if player.position.x > finishX {
            canRestart = true
            isVictory = true
            currentObjective = "Mission accomplie."
            viewModel?.setStatus("Toutes les zones web ont été reconstituées en SpriteKit natif")
            syncHud()
        }
    }

    func didBegin(_ contact: SKPhysicsContact) {
        let categories = contact.bodyA.categoryBitMask | contact.bodyB.categoryBitMask
        if categories == (PhysicsCategory.player | PhysicsCategory.world) {
            groundContacts += 1
        } else if categories == (PhysicsCategory.player | PhysicsCategory.coin) {
            handlePickup(named: "coin", in: contact)
        } else if categories == (PhysicsCategory.player | PhysicsCategory.heart) {
            handlePickup(named: "heart", in: contact)
        } else if categories == (PhysicsCategory.player | PhysicsCategory.portal) {
            handlePortalContact(contact)
        } else if categories == (PhysicsCategory.player | PhysicsCategory.enemy) {
            handleEnemyContact(contact)
        }
    }

    func didEnd(_ contact: SKPhysicsContact) {
        let categories = contact.bodyA.categoryBitMask | contact.bodyB.categoryBitMask
        if categories == (PhysicsCategory.player | PhysicsCategory.world) {
            groundContacts = max(0, groundContacts - 1)
        }
    }

    private func handlePickup(named: String, in contact: SKPhysicsContact) {
        let node = contact.bodyA.categoryBitMask == PhysicsCategory.player ? contact.bodyB.node : contact.bodyA.node
        node?.removeFromParent()
        if named == "coin" {
            coins += 1
            viewModel?.setStatus("Pièce récupérée")
        } else {
            hearts = min(maxHearts, hearts + 1)
            viewModel?.setStatus("Cœur restauré")
        }
        syncHud()
    }

    private func handlePortalContact(_ contact: SKPhysicsContact) {
        guard currentPortal == nil else { return }
        let node = contact.bodyA.categoryBitMask == PhysicsCategory.portal ? contact.bodyA.node : contact.bodyB.node
        guard let portal = node as? WarpPortalNode, !portal.isUnlocked else { return }
        currentPortal = portal
        isPaused = true
        viewModel?.show(question: portal.question)
        viewModel?.setStatus("Réponds correctement pour stabiliser le portail")
    }

    private func handleEnemyContact(_ contact: SKPhysicsContact) {
        let node = contact.bodyA.categoryBitMask == PhysicsCategory.enemy ? contact.bodyA.node : contact.bodyB.node
        guard let enemy = node as? EnemyNode, !enemy.hasBeenDefeated else { return }
        let playerBottom = player.frame.minY
        let enemyTop = enemy.frame.maxY - 20
        if player.physicsBody?.velocity.dy ?? 0 < -40, playerBottom > enemyTop {
            enemy.hasBeenDefeated = true
            enemy.removeAllActions()
            enemy.physicsBody = nil
            enemy.run(.sequence([.group([.fadeOut(withDuration: 0.28), .moveBy(x: 0, y: -20, duration: 0.28)]), .removeFromParent()]))
            player.physicsBody?.velocity.dy = 560
            coins += 2
            viewModel?.setStatus("Gardien neutralisé")
            syncHud()
        } else {
            applyDamage(reason: "Un gardien te repousse.")
        }
    }

    private func applyDamage(reason: String) {
        let now = CACurrentMediaTime()
        guard now - lastDamageTime > 1.0 else { return }
        lastDamageTime = now
        hearts -= 1
        viewModel?.setStatus(reason)
        let flashOut = SKAction.fadeAlpha(to: 0.35, duration: 0.08)
        let flashIn = SKAction.fadeAlpha(to: 1.0, duration: 0.08)
        player.run(.sequence([flashOut, flashIn, flashOut, flashIn]))
        if hearts <= 0 {
            hearts = 0
            canRestart = true
            isVictory = false
            currentObjective = "Recharge le Warp Zone pour repartir."
            viewModel?.setStatus("Le prototype natif est tombé, relance une partie.")
        } else {
            respawnNearCurrentBiome()
        }
        syncHud()
    }

    private func respawnNearCurrentBiome() {
        let startX = -levelWidth * 0.5
        let normalized = max(0, min(levelWidth - 1, player.position.x - startX))
        let index = min(biomes.count - 1, Int(normalized / segmentWidth))
        let respawnX = startX + CGFloat(index) * segmentWidth + 140
        player.position = CGPoint(x: respawnX, y: baseGroundY + 250)
        player.physicsBody?.velocity = .zero
    }

    private func runRunAnimation(facingRight: Bool) {
        let actionKey = facingRight ? "run-right" : "run-left"
        if player.action(forKey: actionKey) != nil { return }
        player.removeAllActions()
        player.xScale = 1
        let textures = facingRight ? runRightTextures : runLeftTextures
        guard !textures.isEmpty else { showIdleTexture(); return }
        player.run(.repeatForever(.animate(with: textures, timePerFrame: 0.09, resize: false, restore: true)), withKey: actionKey)
    }

    private func runJumpAnimation(facingRight: Bool) {
        player.removeAllActions()
        player.xScale = 1
        let textures = facingRight ? jumpRightTextures : jumpLeftTextures
        guard !textures.isEmpty else { return }
        player.run(.animate(with: textures, timePerFrame: 0.06, resize: false, restore: true))
    }

    private func showIdleTexture() {
        player.removeAllActions()
        if let playerIdleTexture {
            player.texture = playerIdleTexture
        }
    }

    private func texture(path: String) -> SKTexture? {
        guard let image = Bundle.main.webAppImage(relativePath: path) else { return nil }
        let texture = SKTexture(image: image)
        texture.filteringMode = .nearest
        return texture
    }

    private func textureSequence(pathPrefix: String, frameCount: Int) -> [SKTexture] {
        (0..<frameCount).compactMap { index in
            texture(path: String(format: "%@/frame_%03d.png", pathPrefix, index))
        }
    }
}

private extension Bundle {
    func webAppImage(relativePath: String) -> UIImage? {
        guard let root = resourceURL?.appendingPathComponent("WebApp", isDirectory: true) else {
            return nil
        }
        let url = root.appendingPathComponent(relativePath)
        return UIImage(contentsOfFile: url.path)
    }
}
