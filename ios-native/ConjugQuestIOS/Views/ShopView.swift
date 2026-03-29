import SwiftUI

/// Hero shop — placeholder for Phase 6.
struct ShopView: View {
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

                Text("Boutique")
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundColor(.white)

                Text("Or : \(appState.persistentGold)")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(.yellow)

                Spacer()

                Text("Bientôt disponible")
                    .foregroundColor(.white.opacity(0.5))

                Spacer()
            }
        }
    }
}
