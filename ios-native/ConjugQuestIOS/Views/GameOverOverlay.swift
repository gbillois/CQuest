import SwiftUI

/// Game Over and Victory overlay.
struct GameOverOverlay: View {
    @ObservedObject var viewModel: GameViewModel
    @ObservedObject var appState: AppState

    var body: some View {
        ZStack {
            Color.black.opacity(0.7)
                .ignoresSafeArea()

            VStack(spacing: 20) {
                // Title
                Text(viewModel.isVictory ? "Champion !" : "Game Over")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundColor(viewModel.isVictory ? .yellow : .red)

                // Subtitle
                Text(viewModel.isVictory
                     ? "Le Dragon est vaincu.\nVous avez obtenu le rang de champion."
                     : "Vous avez perdu tous vos cœurs.")
                    .font(.system(size: 15))
                    .foregroundColor(.white.opacity(0.8))
                    .multilineTextAlignment(.center)

                // Stats
                VStack(spacing: 8) {
                    Text("Score final : \(viewModel.score)")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                    Text("Pièces : \(viewModel.gold)")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.yellow)
                }

                // Buttons
                if !viewModel.isVictory {
                    Button {
                        viewModel.restartLevel()
                    } label: {
                        Text("Recommencer le niveau")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white)
                            .frame(minWidth: 220)
                            .padding(.vertical, 12)
                            .background(Color.blue.opacity(0.6))
                            .cornerRadius(10)
                    }
                }

                Button {
                    viewModel.isGameOver = false
                    viewModel.isVictory = false
                    appState.currentScreen = .title
                } label: {
                    Text("Écran titre")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white)
                        .frame(minWidth: 220)
                        .padding(.vertical, 12)
                        .background(Color.white.opacity(0.15))
                        .cornerRadius(10)
                }
            }
            .padding(32)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(white: 0.1, opacity: 0.9))
            )
        }
    }
}
