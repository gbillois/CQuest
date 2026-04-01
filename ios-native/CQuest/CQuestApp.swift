import SwiftUI

@main
struct CQuestApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .persistentSystemOverlays(.hidden)
                .statusBarHidden(true)
                .preferredColorScheme(.dark)
        }
    }
}
