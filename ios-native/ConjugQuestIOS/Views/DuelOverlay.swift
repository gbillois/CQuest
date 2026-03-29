import SwiftUI

/// Conjugation duel overlay: enemy vs player, question prompt, 4 answer buttons, timer.
/// Centered on screen with adaptive sizing via GeometryReader.
struct DuelOverlay: View {
    let duel: DuelState
    @ObservedObject var viewModel: GameViewModel

    @State private var timeRemaining: CGFloat
    @State private var timer: Timer?
    @State private var selectedAnswer: Int? = nil

    init(duel: DuelState, viewModel: GameViewModel) {
        self.duel = duel
        self.viewModel = viewModel
        self._timeRemaining = State(initialValue: duel.timeLimit)
    }

    var body: some View {
        GeometryReader { geometry in
            let maxWidth = min(geometry.size.width - 48, 400.0)

            ZStack {
                // Dim background
                Color.black.opacity(0.7)
                    .ignoresSafeArea()

                VStack(spacing: 16) {
                    // Timer
                    Text(String(format: "⏱ %.0fs", timeRemaining))
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundColor(timeRemaining <= 3 ? .red : .white)

                    // Question prompt
                    Text(duel.prompt)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 12)

                    // Answer buttons
                    VStack(spacing: 10) {
                        ForEach(0..<duel.answers.count, id: \.self) { i in
                            Button {
                                guard selectedAnswer == nil else { return }
                                selectedAnswer = i
                                viewModel.answerDuel(index: i)
                            } label: {
                                Text(duel.answers[i])
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 12)
                                    .background(answerBackground(for: i))
                                    .cornerRadius(10)
                            }
                            .disabled(selectedAnswer != nil)
                        }
                    }
                }
                .frame(maxWidth: maxWidth)
                .padding(24)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color(white: 0.1, opacity: 0.95))
                )
            }
        }
        .onAppear { startTimer() }
        .onDisappear { timer?.invalidate() }
    }

    private func answerBackground(for index: Int) -> Color {
        if let selected = selectedAnswer {
            if index == duel.correctIndex { return .green.opacity(0.7) }
            if index == selected { return .red.opacity(0.7) }
            return Color.white.opacity(0.1)
        }
        return Color.white.opacity(0.2)
    }

    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
            Task { @MainActor in
                timeRemaining -= 0.1
                if timeRemaining <= 0 {
                    timer?.invalidate()
                    if selectedAnswer == nil {
                        selectedAnswer = -1
                        viewModel.answerDuel(index: -1) // timeout
                    }
                }
            }
        }
    }
}
