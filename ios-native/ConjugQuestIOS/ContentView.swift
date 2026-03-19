import SwiftUI

struct ContentView: View {
    var body: some View {
        GameWebView()
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .ignoresSafeArea()
            .background(Color.black)
    }
}
