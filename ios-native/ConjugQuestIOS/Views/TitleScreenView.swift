import SwiftUI

/// Title screen: game logo, subtitle, start button, leaderboard, settings.
struct TitleScreenView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Background gradient
                LinearGradient(
                    colors: [
                        Color(red: 0.1, green: 0.08, blue: 0.26),
                        Color(red: 0.18, green: 0.17, blue: 0.41)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()

                VStack(spacing: 0) {
                    Spacer()
                        .frame(height: geometry.size.height * 0.15)

                    // Title
                    Text("ConjugQuest")
                        .font(.system(size: min(geometry.size.width * 0.1, 42), weight: .black, design: .rounded))
                        .foregroundColor(.white)

                    Text("Plateformer horizontal")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white.opacity(0.6))
                        .padding(.top, 4)

                    // Subtitle
                    Text("Libère le royaume grâce à tes pouvoirs de conjugaison !")
                        .font(.system(size: 15))
                        .foregroundColor(.white.opacity(0.75))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                        .padding(.top, 16)

                    Spacer()

                    // Buttons
                    VStack(spacing: 14) {
                        Button {
                            appState.currentScreen = .game
                        } label: {
                            Text("Démarrer")
                                .font(.system(size: 20, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                                .frame(maxWidth: min(geometry.size.width * 0.7, 280))
                                .padding(.vertical, 16)
                                .background(
                                    RoundedRectangle(cornerRadius: 14)
                                        .fill(Color(red: 0.2, green: 0.6, blue: 0.35))
                                )
                        }

                        Button {
                            appState.currentScreen = .leaderboard
                        } label: {
                            Text("Classement")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.white.opacity(0.9))
                                .frame(maxWidth: min(geometry.size.width * 0.7, 280))
                                .padding(.vertical, 12)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(Color.white.opacity(0.12))
                                )
                        }

                        Button {
                            appState.currentScreen = .shop
                        } label: {
                            Text("Boutique")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.white.opacity(0.9))
                                .frame(maxWidth: min(geometry.size.width * 0.7, 280))
                                .padding(.vertical, 12)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(Color.white.opacity(0.12))
                                )
                        }

                        Button {
                            appState.currentScreen = .settings
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "gearshape.fill")
                                    .font(.system(size: 14))
                                Text("Réglages")
                                    .font(.system(size: 16, weight: .medium))
                            }
                            .foregroundColor(.white.opacity(0.8))
                        }
                    }

                    Spacer()
                        .frame(height: geometry.size.height * 0.12)
                }
            }
        }
    }
}
