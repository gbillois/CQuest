import SwiftUI

/// Hero shop: grid of 8 heroes with buy/equip, gold wallet display.
struct ShopView: View {
    @EnvironmentObject var appState: AppState

    private let heroes: [(id: String, name: String)] = {
        GameConstants.heroShopConfig
            .sorted { $0.value.order < $1.value.order }
            .map { (id: $0.key, name: $0.key.capitalized) }
    }()

    var body: some View {
        ZStack {
            Color(red: 0.1, green: 0.08, blue: 0.26)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
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
                    HStack(spacing: 4) {
                        Image(systemName: "circle.fill")
                            .foregroundColor(.yellow)
                            .font(.system(size: 12))
                        Text("\(appState.persistentGold)")
                            .font(.system(size: 17, weight: .bold))
                            .foregroundColor(.yellow)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)

                Text("Boutique")
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                    .padding(.top, 12)

                ScrollView {
                    LazyVGrid(columns: [
                        GridItem(.flexible(), spacing: 12),
                        GridItem(.flexible(), spacing: 12),
                    ], spacing: 12) {
                        ForEach(heroes, id: \.id) { hero in
                            heroCard(hero: hero)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 16)
                    .padding(.bottom, 40)
                }
            }
        }
    }

    @ViewBuilder
    private func heroCard(hero: (id: String, name: String)) -> some View {
        let config = GameConstants.heroShopConfig[hero.id]!
        let isOwned = appState.isHeroUnlocked(hero.id)
        let isSelected = appState.selectedHeroId == hero.id

        VStack(spacing: 8) {
            // Hero sprite placeholder (colored rect with initial)
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(isSelected ? Color.green.opacity(0.2) : Color.white.opacity(0.08))
                    .frame(height: 80)

                Text(String(hero.name.prefix(2)).uppercased())
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundColor(isSelected ? .green : .white.opacity(0.6))
            }

            Text(hero.name)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white)

            if isOwned {
                if isSelected {
                    Text("Équipé")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.green)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 6)
                        .background(Color.green.opacity(0.15))
                        .cornerRadius(8)
                } else {
                    Button {
                        appState.selectedHeroId = hero.id
                    } label: {
                        Text("Équiper")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 6)
                            .background(Color.blue.opacity(0.4))
                            .cornerRadius(8)
                    }
                }
            } else {
                Button {
                    if appState.spendGold(config.price) {
                        appState.unlockHero(hero.id)
                        appState.selectedHeroId = hero.id
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "circle.fill")
                            .foregroundColor(.yellow)
                            .font(.system(size: 8))
                        Text("\(config.price)")
                            .font(.system(size: 12, weight: .bold))
                    }
                    .foregroundColor(appState.persistentGold >= config.price ? .yellow : .gray)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(Color.white.opacity(0.1))
                    .cornerRadius(8)
                }
                .disabled(appState.persistentGold < config.price)
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(isSelected ? Color.green.opacity(0.5) : Color.clear, lineWidth: 1.5)
                )
        )
    }
}
