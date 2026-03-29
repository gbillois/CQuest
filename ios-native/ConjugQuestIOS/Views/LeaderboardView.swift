import SwiftUI

/// Leaderboard screen — placeholder for Phase 6.
struct LeaderboardView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        ZStack {
            Color(red: 0.1, green: 0.08, blue: 0.26)
                .ignoresSafeArea()

            VStack(spacing: 20) {
                HStack {
                    Button {
                        appState.currentScreen = .title
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "chevron.left")
                            Text("Retour")
                        }
                        .foregroundColor(.white.opacity(0.8))
                    }
                    Spacer()
                }
                .padding(.horizontal, 16)

                Text("Classement")
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundColor(.white)

                if appState.leaderboard.isEmpty {
                    Spacer()
                    Text("Aucun score pour le moment.")
                        .foregroundColor(.white.opacity(0.5))
                    Spacer()
                } else {
                    ScrollView {
                        VStack(spacing: 8) {
                            ForEach(Array(appState.leaderboard.enumerated()), id: \.element.id) { index, entry in
                                HStack {
                                    Text("#\(index + 1)")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(.yellow)
                                        .frame(width: 30)
                                    Text(entry.name)
                                        .font(.system(size: 15, weight: .medium))
                                        .foregroundColor(.white)
                                    Spacer()
                                    Text("\(entry.score)")
                                        .font(.system(size: 15, weight: .bold))
                                        .foregroundColor(.white)
                                    Text("\(entry.coins) pièces")
                                        .font(.system(size: 12))
                                        .foregroundColor(.yellow.opacity(0.8))
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(Color.white.opacity(0.06))
                                .cornerRadius(8)
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                }
            }
        }
    }
}
