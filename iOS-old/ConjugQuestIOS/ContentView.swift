import SwiftUI

/// Full-screen WKWebView that loads the web game from the app bundle.
/// The web version handles all layout, safe areas, and touch controls via CSS.
struct ContentView: View {
    var body: some View {
        WebViewRepresentable()
            .ignoresSafeArea()
    }
}
