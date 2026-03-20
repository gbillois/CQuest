import SwiftUI

struct ContentView: View {
    @State private var isWarpZonePresented = false

    var body: some View {
        GameWebView(onOpenWarpZone: {
            isWarpZonePresented = true
        })
        .ignoresSafeArea()
        .background(Color.black)
        .fullScreenCover(isPresented: $isWarpZonePresented) {
            WarpZoneGameView(isPresented: $isWarpZonePresented)
        }
    }
}
