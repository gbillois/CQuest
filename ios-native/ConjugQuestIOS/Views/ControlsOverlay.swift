import SwiftUI

/// Bottom touch controls: Left / Right movement buttons and Jump / Fire buttons.
/// All sizes are relative to screen width — never hardcoded pixels.
/// Positioned above the bottom safe area inset.
struct ControlsOverlay: View {
    @ObservedObject var viewModel: GameViewModel
    let screenWidth: CGFloat

    /// Button size scales with screen width (roughly 15% of width, capped at 70pt)
    private var buttonSize: CGFloat {
        min(screenWidth * 0.15, 70)
    }

    private var iconSize: CGFloat {
        buttonSize * 0.45
    }

    var body: some View {
        HStack(alignment: .bottom) {
            // Left side: movement buttons
            HStack(spacing: buttonSize * 0.3) {
                holdButton(icon: "chevron.left", isPressed: $viewModel.inputLeft)
                holdButton(icon: "chevron.right", isPressed: $viewModel.inputRight)
            }

            Spacer()

            // Right side: action buttons
            HStack(spacing: buttonSize * 0.3) {
                // Fire button
                holdButton(icon: "flame.fill", isPressed: $viewModel.inputFire)
                    .opacity(0.7) // Subtle — not all heroes can fire

                // Jump button (larger)
                holdButton(icon: "arrow.up", isPressed: $viewModel.inputJump, scale: 1.15)
            }
        }
    }

    @ViewBuilder
    private func holdButton(
        icon: String,
        isPressed: Binding<Bool>,
        scale: CGFloat = 1.0
    ) -> some View {
        let size = buttonSize * scale
        Circle()
            .fill(isPressed.wrappedValue ? Color.white.opacity(0.4) : Color.white.opacity(0.15))
            .frame(width: size, height: size)
            .overlay(
                Image(systemName: icon)
                    .font(.system(size: iconSize * scale, weight: .bold))
                    .foregroundColor(.white)
            )
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in
                        if !isPressed.wrappedValue {
                            isPressed.wrappedValue = true
                        }
                    }
                    .onEnded { _ in
                        isPressed.wrappedValue = false
                        // Track jump release for variable jump height
                        if icon == "arrow.up" {
                            viewModel.inputJumpReleased = true
                        }
                    }
            )
    }
}
