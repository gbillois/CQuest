import SwiftUI
import Combine

/// Observable bridge between GameScene (SpriteKit) and SwiftUI overlays.
/// GameScene writes state here; SwiftUI views read it reactively.
@MainActor
final class GameViewModel: ObservableObject {
    // MARK: - HUD State
    @Published var score: Int = 0
    @Published var hearts: Int = 3
    @Published var maxHearts: Int = 5
    @Published var gold: Int = 0

    // MARK: - Game Flow
    @Published var isGameOver: Bool = false
    @Published var isVictory: Bool = false
    @Published var isPaused: Bool = false
    @Published var currentBiome: String = "forest"
    @Published var currentLevelIndex: Int = 0
    @Published var statusMessage: String = ""

    // MARK: - Duel State
    @Published var activeDuel: DuelState? = nil

    // MARK: - Controls Input (SwiftUI writes, GameScene reads)
    @Published var inputLeft: Bool = false
    @Published var inputRight: Bool = false
    @Published var inputJump: Bool = false
    @Published var inputJumpReleased: Bool = false
    @Published var inputFire: Bool = false

    // MARK: - Scene Reference
    weak var scene: GameScene?

    // MARK: - Actions from SwiftUI to Scene

    func pauseGame() {
        isPaused = true
        scene?.isPaused = true
    }

    func resumeGame() {
        isPaused = false
        scene?.isPaused = false
    }

    func restartLevel() {
        isGameOver = false
        isVictory = false
        scene?.restartCurrentLevel()
    }

    func answerDuel(index: Int) {
        scene?.answerDuel(index: index)
    }

    func dismissDuel() {
        activeDuel = nil
    }
}

// MARK: - Duel State

struct DuelState: Identifiable {
    let id = UUID()
    let prompt: String
    let answers: [String]
    let correctIndex: Int
    let enemySpritePath: String?
    let heroSpritePath: String?
    let timeLimit: CGFloat
    var answered: Bool = false
    var selectedIndex: Int? = nil
}
