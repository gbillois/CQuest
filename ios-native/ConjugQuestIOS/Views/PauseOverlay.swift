import SwiftUI

/// Pause menu overlay: Resume, Settings, Back to Title.
struct PauseOverlay: View {
    @ObservedObject var viewModel: GameViewModel
    @ObservedObject var appState: AppState

    var body: some View {
        ZStack {
            Color.black.opacity(0.6)
                .ignoresSafeArea()

            VStack(spacing: 20) {
                Text("Jeu en pause")
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundColor(.white)

                Button {
                    viewModel.resumeGame()
                } label: {
                    menuButton(text: "Reprendre", icon: "play.fill")
                }

                Button {
                    appState.currentScreen = .settings
                } label: {
                    menuButton(text: "Réglages", icon: "gearshape.fill")
                }

                Button {
                    viewModel.resumeGame()
                    appState.currentScreen = .title
                } label: {
                    menuButton(text: "Écran titre", icon: "house.fill")
                }
            }
            .padding(32)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(white: 0.1, opacity: 0.9))
            )
        }
    }

    @ViewBuilder
    private func menuButton(text: String, icon: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 16))
            Text(text)
                .font(.system(size: 17, weight: .medium))
        }
        .foregroundColor(.white)
        .frame(minWidth: 200)
        .padding(.vertical, 12)
        .background(Color.white.opacity(0.15))
        .cornerRadius(10)
    }
}
