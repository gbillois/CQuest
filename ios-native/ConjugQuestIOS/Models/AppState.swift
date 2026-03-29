import SwiftUI

/// Global app state: navigation, persistence (UserDefaults), hero unlocks, gold.
@MainActor
final class AppState: ObservableObject {
    // MARK: - Navigation
    enum Screen {
        case title
        case game
        case settings
        case shop
        case leaderboard
    }

    @Published var currentScreen: Screen = .title

    // MARK: - Persistent State
    @Published var persistentGold: Int {
        didSet { UserDefaults.standard.set(persistentGold, forKey: Keys.gold) }
    }
    @Published var heroUnlocks: [String: Bool] {
        didSet {
            if let data = try? JSONEncoder().encode(heroUnlocks) {
                UserDefaults.standard.set(data, forKey: Keys.heroUnlocks)
            }
        }
    }
    @Published var selectedHeroId: String {
        didSet { UserDefaults.standard.set(selectedHeroId, forKey: Keys.selectedHero) }
    }
    @Published var difficultyMode: String {
        didSet { UserDefaults.standard.set(difficultyMode, forKey: Keys.difficulty) }
    }
    @Published var activeTenses: [String] {
        didSet {
            if let data = try? JSONEncoder().encode(activeTenses) {
                UserDefaults.standard.set(data, forKey: Keys.activeTenses)
            }
        }
    }
    @Published var activeGroups: [String] {
        didSet {
            if let data = try? JSONEncoder().encode(activeGroups) {
                UserDefaults.standard.set(data, forKey: Keys.activeGroups)
            }
        }
    }

    // MARK: - Leaderboard
    struct LeaderboardEntry: Codable, Identifiable {
        let id: UUID
        let name: String
        let score: Int
        let coins: Int
        let mode: String
        let timestamp: Date

        init(name: String, score: Int, coins: Int, mode: String) {
            self.id = UUID()
            self.name = name
            self.score = score
            self.coins = coins
            self.mode = mode
            self.timestamp = Date()
        }
    }

    @Published var leaderboard: [LeaderboardEntry] = []

    // MARK: - Keys
    private enum Keys {
        static let gold = "cquest_gold"
        static let heroUnlocks = "cquest_hero_unlocks_v1"
        static let selectedHero = "cquest_selected_hero_v1"
        static let difficulty = "cquest_difficulty"
        static let activeTenses = "cquest_pedagogy_tenses_v1"
        static let activeGroups = "cquest_pedagogy_groups_v1"
        static let leaderboard = "cquest_leaderboard_v1"
    }

    // MARK: - Init
    init() {
        let defaults = UserDefaults.standard

        self.persistentGold = defaults.integer(forKey: Keys.gold)

        if let data = defaults.data(forKey: Keys.heroUnlocks),
           let unlocks = try? JSONDecoder().decode([String: Bool].self, from: data) {
            self.heroUnlocks = unlocks
        } else {
            self.heroUnlocks = ["paladin": true]
        }

        self.selectedHeroId = defaults.string(forKey: Keys.selectedHero) ?? "paladin"
        self.difficultyMode = defaults.string(forKey: Keys.difficulty) ?? "normal"

        if let data = defaults.data(forKey: Keys.activeTenses),
           let tenses = try? JSONDecoder().decode([String].self, from: data) {
            self.activeTenses = tenses
        } else {
            self.activeTenses = GameConstants.tenseKeys
        }

        if let data = defaults.data(forKey: Keys.activeGroups),
           let groups = try? JSONDecoder().decode([String].self, from: data) {
            self.activeGroups = groups
        } else {
            self.activeGroups = []  // Will be populated when conjugation data loads
        }

        if let data = defaults.data(forKey: Keys.leaderboard),
           let entries = try? JSONDecoder().decode([LeaderboardEntry].self, from: data) {
            self.leaderboard = entries.sorted { $0.score > $1.score }.prefix(10).map { $0 }
        }
    }

    // MARK: - Actions

    func addGold(_ amount: Int) {
        persistentGold += amount
    }

    func spendGold(_ amount: Int) -> Bool {
        guard persistentGold >= amount else { return false }
        persistentGold -= amount
        return true
    }

    func unlockHero(_ heroId: String) {
        heroUnlocks[heroId] = true
    }

    func isHeroUnlocked(_ heroId: String) -> Bool {
        heroUnlocks[heroId] == true
    }

    func addLeaderboardEntry(name: String, score: Int, coins: Int, mode: String) {
        let entry = LeaderboardEntry(name: name, score: score, coins: coins, mode: mode)
        leaderboard.append(entry)
        leaderboard.sort { $0.score > $1.score }
        if leaderboard.count > 10 { leaderboard = Array(leaderboard.prefix(10)) }
        if let data = try? JSONEncoder().encode(leaderboard) {
            UserDefaults.standard.set(data, forKey: Keys.leaderboard)
        }
    }

    func resetAll() {
        persistentGold = 0
        heroUnlocks = ["paladin": true]
        selectedHeroId = "paladin"
        difficultyMode = "normal"
        activeTenses = GameConstants.tenseKeys
        activeGroups = []
        leaderboard = []
        let defaults = UserDefaults.standard
        defaults.removeObject(forKey: Keys.gold)
        defaults.removeObject(forKey: Keys.heroUnlocks)
        defaults.removeObject(forKey: Keys.selectedHero)
        defaults.removeObject(forKey: Keys.difficulty)
        defaults.removeObject(forKey: Keys.activeTenses)
        defaults.removeObject(forKey: Keys.activeGroups)
        defaults.removeObject(forKey: Keys.leaderboard)
    }
}
