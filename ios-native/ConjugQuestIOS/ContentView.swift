import SwiftUI

struct ContentView: View {
    @State private var isWarpZonePresented = false

    var body: some View {
        GameWebView(onOpenWarpZone: {
            isWarpZonePresented = true
        })
        .ignoresSafeArea()
        .background(Color.black)
        .sheet(isPresented: $isWarpZonePresented) {
            WarpZoneView(isPresented: $isWarpZonePresented)
        }
    }
}

private struct WarpZoneView: View {
    @Binding var isPresented: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()
                Text("Hello")
                    .font(.system(size: 34, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .multilineTextAlignment(.center)
                Button("retour") {
                    isPresented = false
                }
                .buttonStyle(.borderedProminent)
                Spacer()
            }
            .padding(24)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(.systemBackground))
            .navigationBarBackButtonHidden(true)
        }
        .presentationDetents([.medium])
    }
}
