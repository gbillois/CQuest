import SwiftUI

/// Settings screen — placeholder for Phase 6, minimal working version for navigation.
struct SettingsView: View {
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

                Text("Réglages")
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundColor(.white)

                // Difficulty picker
                VStack(alignment: .leading, spacing: 8) {
                    Text("Mode de jeu")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.white.opacity(0.8))

                    Picker("Mode", selection: $appState.difficultyMode) {
                        Text("Facile").tag("easy")
                        Text("Normal").tag("normal")
                    }
                    .pickerStyle(.segmented)
                }
                .padding(.horizontal, 24)

                Spacer()

                // Reset button
                Button {
                    appState.resetAll()
                } label: {
                    Text("Remise à zéro")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(.red)
                        .padding(.vertical, 10)
                        .frame(maxWidth: 200)
                        .background(Color.red.opacity(0.15))
                        .cornerRadius(10)
                }

                Spacer()
                    .frame(height: 40)
            }
        }
    }
}
