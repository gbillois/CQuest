import SwiftUI

/// Settings screen: hero selection, difficulty, tense/group filters, reset.
struct SettingsView: View {
    @EnvironmentObject var appState: AppState
    @State private var showResetConfirm = false

    private let tenseOptions: [(key: String, label: String)] = [
        ("pr", "Présent"),
        ("pc", "Passé composé"),
        ("im", "Imparfait"),
        ("fu", "Futur"),
        ("co", "Conditionnel"),
    ]

    private let groupOptions: [(key: String, label: String)] = [
        ("g1", "1er groupe"),
        ("g2", "2ème groupe"),
        ("g3", "3ème groupe"),
        ("irr1", "Irréguliers 1"),
        ("irr2", "Irréguliers 2"),
        ("irr3", "Irréguliers 3"),
    ]

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
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)

                ScrollView {
                    VStack(spacing: 24) {
                        Text("Réglages")
                            .font(.system(size: 24, weight: .bold, design: .rounded))
                            .foregroundColor(.white)

                        // Hero selection
                        sectionCard(title: "Héros") {
                            let ownedHeroes = GameConstants.heroShopConfig
                                .filter { appState.isHeroUnlocked($0.key) }
                                .sorted { $0.value.order < $1.value.order }
                                .map { $0.key }

                            if ownedHeroes.count > 1 {
                                Picker("Héros", selection: $appState.selectedHeroId) {
                                    ForEach(ownedHeroes, id: \.self) { heroId in
                                        Text(heroId.capitalized).tag(heroId)
                                    }
                                }
                                .pickerStyle(.segmented)
                            } else {
                                Text("Paladin (seul héros débloqué)")
                                    .font(.system(size: 14))
                                    .foregroundColor(.white.opacity(0.6))
                            }
                        }

                        // Difficulty
                        sectionCard(title: "Mode de jeu") {
                            Picker("Mode", selection: $appState.difficultyMode) {
                                Text("Facile").tag("easy")
                                Text("Normal").tag("normal")
                                Text("Chaotique").tag("chaotic")
                            }
                            .pickerStyle(.segmented)
                        }

                        // Tenses
                        sectionCard(title: "Temps de conjugaison") {
                            VStack(spacing: 8) {
                                ForEach(tenseOptions, id: \.key) { option in
                                    Toggle(isOn: tenseBinding(for: option.key)) {
                                        Text(option.label)
                                            .font(.system(size: 15))
                                            .foregroundColor(.white)
                                    }
                                    .tint(.green)
                                }
                            }
                        }

                        // Groups
                        sectionCard(title: "Groupes de verbes") {
                            VStack(spacing: 8) {
                                ForEach(groupOptions, id: \.key) { option in
                                    Toggle(isOn: groupBinding(for: option.key)) {
                                        Text(option.label)
                                            .font(.system(size: 15))
                                            .foregroundColor(.white)
                                    }
                                    .tint(.green)
                                }
                            }
                        }

                        // Reset
                        Button {
                            showResetConfirm = true
                        } label: {
                            Text("Remise à zéro")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundColor(.red)
                                .padding(.vertical, 10)
                                .frame(maxWidth: 200)
                                .background(Color.red.opacity(0.15))
                                .cornerRadius(10)
                        }
                        .alert("Confirmer la remise à zéro", isPresented: $showResetConfirm) {
                            Button("Annuler", role: .cancel) { }
                            Button("Réinitialiser", role: .destructive) {
                                appState.resetAll()
                            }
                        } message: {
                            Text("Tout l'or, les héros débloqués et les scores seront perdus.")
                        }

                        Spacer().frame(height: 40)
                    }
                    .padding(.horizontal, 20)
                }
            }
        }
    }

    @ViewBuilder
    private func sectionCard<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.white.opacity(0.7))
            content()
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.06))
        .cornerRadius(12)
    }

    private func tenseBinding(for key: String) -> Binding<Bool> {
        Binding(
            get: { appState.activeTenses.contains(key) },
            set: { enabled in
                if enabled {
                    if !appState.activeTenses.contains(key) {
                        appState.activeTenses.append(key)
                    }
                } else {
                    // Prevent disabling all tenses
                    if appState.activeTenses.count > 1 {
                        appState.activeTenses.removeAll { $0 == key }
                    }
                }
            }
        )
    }

    private func groupBinding(for key: String) -> Binding<Bool> {
        Binding(
            get: { appState.activeGroups.contains(key) },
            set: { enabled in
                if enabled {
                    if !appState.activeGroups.contains(key) {
                        appState.activeGroups.append(key)
                    }
                } else {
                    if appState.activeGroups.count > 1 {
                        appState.activeGroups.removeAll { $0 == key }
                    }
                }
            }
        )
    }
}
