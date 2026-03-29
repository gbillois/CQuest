import SwiftUI
import SpriteKit

/// Main game container: SpriteView fills the entire screen, SwiftUI overlays float on top.
/// Uses GeometryReader for all layout to adapt to every iPhone/iPad screen size.
///
/// DISPLAY RULES (never violate):
/// - SpriteView has .ignoresSafeArea() and ZERO padding — fills entire screen
/// - HUD positioned below top safe area
/// - Controls positioned above bottom safe area
/// - All sizes relative to geometry, never hardcoded pixels
/// - Overlays use ZStack layering, never padding on SpriteView
struct GameContainerView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var viewModel = GameViewModel()

    @State private var scene: GameScene = {
        let s = GameScene(size: CGSize(
            width: GameConstants.virtualWidth,
            height: GameConstants.virtualHeight
        ))
        s.scaleMode = .aspectFill
        return s
    }()

    var body: some View {
        GeometryReader { geometry in
            let safeTop = geometry.safeAreaInsets.top
            let safeBottom = geometry.safeAreaInsets.bottom
            let screenWidth = geometry.size.width
            let screenHeight = geometry.size.height

            ZStack {
                // Layer 1: Game scene — fills entire screen including safe areas
                SpriteView(scene: scene, options: [.allowsTransparency])
                    .ignoresSafeArea()
                    .onAppear {
                        scene.bind(to: viewModel)
                        scene.configure(
                            heroId: appState.selectedHeroId,
                            difficulty: appState.difficultyMode,
                            activeTenses: Set(appState.activeTenses),
                            activeGroups: Set(appState.activeGroups.isEmpty
                                ? Array(ConjugationData.verbs.keys)
                                : appState.activeGroups)
                        )
                    }

                // Layer 2: HUD + Controls overlay
                VStack(spacing: 0) {
                    // HUD at top, respecting safe area
                    GameHUD(viewModel: viewModel)
                        .padding(.top, safeTop + 8)
                        .padding(.horizontal, 16)

                    Spacer()

                    // Controls at bottom, respecting safe area
                    ControlsOverlay(viewModel: viewModel, screenWidth: screenWidth)
                        .padding(.bottom, safeBottom + 12)
                        .padding(.horizontal, 12)
                }

                // Layer 3: Duel overlay (when active)
                if let duel = viewModel.activeDuel {
                    DuelOverlay(duel: duel, viewModel: viewModel)
                        .transition(.opacity)
                }

                // Layer 4: Pause overlay
                if viewModel.isPaused {
                    PauseOverlay(viewModel: viewModel, appState: appState)
                        .transition(.opacity)
                }

                // Layer 5: Game Over overlay
                if viewModel.isGameOver || viewModel.isVictory {
                    GameOverOverlay(viewModel: viewModel, appState: appState)
                        .transition(.opacity)
                }
            }
            .animation(.easeInOut(duration: 0.2), value: viewModel.isPaused)
            .animation(.easeInOut(duration: 0.2), value: viewModel.isGameOver)
            .animation(.easeInOut(duration: 0.2), value: viewModel.isVictory)
            .animation(.easeInOut(duration: 0.2), value: viewModel.activeDuel != nil)
        }
    }
}
