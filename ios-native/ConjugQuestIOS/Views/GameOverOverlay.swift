import SwiftUI

/// Game Over and Victory overlay with name entry for leaderboard.
struct GameOverOverlay: View {
    @ObservedObject var viewModel: GameViewModel
    @ObservedObject var appState: AppState
    @State private var playerName: String = ""
    @State private var savedToLeaderboard: Bool = false

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

                // Name entry for leaderboard
                if !savedToLeaderboard {
                    VStack(spacing: 8) {
                        Text("Entrez votre nom")
                            .font(.system(size: 13))
                            .foregroundColor(.white.opacity(0.6))

                        TextField("Nom", text: $playerName)
                            .font(.system(size: 16))
                            .foregroundColor(.white)
                            .padding(10)
                            .background(Color.white.opacity(0.1))
                            .cornerRadius(8)
                            .frame(maxWidth: 200)
                            .autocorrectionDisabled()

                        Button {
                            let name = playerName.isEmpty ? "Joueur" : playerName
                            appState.addLeaderboardEntry(
                                name: name,
                                score: viewModel.score,
                                coins: viewModel.gold,
                                mode: appState.difficultyMode
                            )
                            savedToLeaderboard = true
                        } label: {
                            Text("Sauvegarder")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.white)
                                .padding(.horizontal, 20)
                                .padding(.vertical, 8)
                                .background(Color.green.opacity(0.5))
                                .cornerRadius(8)
                        }
                    }
                } else {
                    Text("Score sauvegardé !")
                        .font(.system(size: 14))
                        .foregroundColor(.green)
                }

                // Buttons
                if !viewModel.isVictory {
                    Button {
                        appState.addGold(viewModel.gold)
                        savedToLeaderboard = false
                        viewModel.restartLevel()
                    } label: {
                        Text("Recommencer")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white)
                            .frame(minWidth: 220)
                            .padding(.vertical, 12)
                            .background(Color.blue.opacity(0.6))
                            .cornerRadius(10)
                    }
                }

                Button {
                    appState.addGold(viewModel.gold)
                    viewModel.isGameOver = false
                    viewModel.isVictory = false
                    savedToLeaderboard = false
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
