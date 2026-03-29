import SwiftUI

/// Root navigation: switches between screens based on AppState.
struct ContentView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        Group {
            switch appState.currentScreen {
            case .title:
                TitleScreenView()
            case .game:
                GameContainerView()
            case .settings:
                SettingsView()
            case .shop:
                ShopView()
            case .leaderboard:
                LeaderboardView()
            }
        }
        .preferredColorScheme(.dark)
        .statusBarHidden(appState.currentScreen == .game)
    }
}
