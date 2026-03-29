import SwiftUI

/// Top HUD overlay showing score, hearts, gold, pause and shop buttons.
/// Positioned below the safe area top inset (never hidden under notch).
struct GameHUD: View {
    @ObservedObject var viewModel: GameViewModel

    var body: some View {
        HStack(spacing: 12) {
            // Score
            HStack(spacing: 4) {
                Image(systemName: "star.fill")
                    .foregroundColor(.yellow)
                    .font(.system(size: 14))
                Text("\(viewModel.score)")
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
            }

            // Hearts
            HStack(spacing: 2) {
                ForEach(0..<viewModel.maxHearts, id: \.self) { i in
                    Image(systemName: i < viewModel.hearts ? "heart.fill" : "heart")
                        .foregroundColor(i < viewModel.hearts ? .red : .gray)
                        .font(.system(size: 13))
                }
            }

            // Gold
            HStack(spacing: 4) {
                Image(systemName: "circle.fill")
                    .foregroundColor(.yellow)
                    .font(.system(size: 10))
                Text("\(viewModel.gold)")
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundColor(.yellow)
            }

            Spacer()

            // Shop button
            Button {
                // Phase 6: open shop
            } label: {
                Image(systemName: "bag.fill")
                    .font(.system(size: 18))
                    .foregroundColor(.white)
            }

            // Pause button
            Button {
                viewModel.pauseGame()
            } label: {
                Image(systemName: "pause.fill")
                    .font(.system(size: 18))
                    .foregroundColor(.white)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.black.opacity(0.5))
        )
    }
}
