import Foundation

/// French verb conjugation database and question generation.
/// Ported from src/conjugation.js — identical verb data and distractor logic.
enum ConjugationData {

    // MARK: - Tenses & Pronouns

    static let tenseKeys = ["pr", "pc", "im", "fu", "co"]
    static let tenseLabels: [String: String] = [
        "pr": "Présent",
        "pc": "Passé composé",
        "im": "Imparfait",
        "fu": "Futur",
        "co": "Conditionnel",
    ]
    static let pronouns = ["je", "tu", "il/elle", "nous", "vous", "ils/elles"]

    // MARK: - Verb Definition

    struct VerbDef {
        let inf: String
        let pr: [String]
        let pc: [String]
        let im: [String]
        let fu: [String]
        let co: [String]
        let pp: String

        func tense(_ key: String) -> [String]? {
            switch key {
            case "pr": return pr
            case "pc": return pc
            case "im": return im
            case "fu": return fu
            case "co": return co
            default: return nil
            }
        }
    }

    struct VerbGroup {
        let label: String
        let list: [String: VerbDef]
    }

    // MARK: - Question

    struct Question {
        let gKey: String
        let vKey: String
        let tense: String
        let tenseLabel: String
        let pronIdx: Int
        let correct: String
        let options: [String]
    }

    // MARK: - Verb Database

    static let verbs: [String: VerbGroup] = [
        "g1": VerbGroup(label: "1er groupe", list: [
            "aimer": VerbDef(
                inf: "aimer",
                pr: ["aime", "aimes", "aime", "aimons", "aimez", "aiment"],
                pc: ["ai aimé", "as aimé", "a aimé", "avons aimé", "avez aimé", "ont aimé"],
                im: ["aimais", "aimais", "aimait", "aimions", "aimiez", "aimaient"],
                fu: ["aimerai", "aimeras", "aimera", "aimerons", "aimerez", "aimeront"],
                co: ["aimerais", "aimerais", "aimerait", "aimerions", "aimeriez", "aimeraient"],
                pp: "aimé"
            ),
            "jouer": VerbDef(
                inf: "jouer",
                pr: ["joue", "joues", "joue", "jouons", "jouez", "jouent"],
                pc: ["ai joué", "as joué", "a joué", "avons joué", "avez joué", "ont joué"],
                im: ["jouais", "jouais", "jouait", "jouions", "jouiez", "jouaient"],
                fu: ["jouerai", "joueras", "jouera", "jouerons", "jouerez", "joueront"],
                co: ["jouerais", "jouerais", "jouerait", "jouerions", "joueriez", "joueraient"],
                pp: "joué"
            ),
        ]),
        "g2": VerbGroup(label: "2ème groupe", list: [
            "finir": VerbDef(
                inf: "finir",
                pr: ["finis", "finis", "finit", "finissons", "finissez", "finissent"],
                pc: ["ai fini", "as fini", "a fini", "avons fini", "avez fini", "ont fini"],
                im: ["finissais", "finissais", "finissait", "finissions", "finissiez", "finissaient"],
                fu: ["finirai", "finiras", "finira", "finirons", "finirez", "finiront"],
                co: ["finirais", "finirais", "finirait", "finirions", "finiriez", "finiraient"],
                pp: "fini"
            ),
        ]),
        "g3": VerbGroup(label: "3ème groupe", list: [
            "prendre": VerbDef(
                inf: "prendre",
                pr: ["prends", "prends", "prend", "prenons", "prenez", "prennent"],
                pc: ["ai pris", "as pris", "a pris", "avons pris", "avez pris", "ont pris"],
                im: ["prenais", "prenais", "prenait", "prenions", "preniez", "prenaient"],
                fu: ["prendrai", "prendras", "prendra", "prendrons", "prendrez", "prendront"],
                co: ["prendrais", "prendrais", "prendrait", "prendrions", "prendriez", "prendraient"],
                pp: "pris"
            ),
        ]),
        "irr1": VerbGroup(label: "Verbes irréguliers — Groupe 1", list: [
            "être": VerbDef(
                inf: "être",
                pr: ["suis", "es", "est", "sommes", "êtes", "sont"],
                pc: ["ai été", "as été", "a été", "avons été", "avez été", "ont été"],
                im: ["étais", "étais", "était", "étions", "étiez", "étaient"],
                fu: ["serai", "seras", "sera", "serons", "serez", "seront"],
                co: ["serais", "serais", "serait", "serions", "seriez", "seraient"],
                pp: "été"
            ),
            "avoir": VerbDef(
                inf: "avoir",
                pr: ["ai", "as", "a", "avons", "avez", "ont"],
                pc: ["ai eu", "as eu", "a eu", "avons eu", "avez eu", "ont eu"],
                im: ["avais", "avais", "avait", "avions", "aviez", "avaient"],
                fu: ["aurai", "auras", "aura", "aurons", "aurez", "auront"],
                co: ["aurais", "aurais", "aurait", "aurions", "auriez", "auraient"],
                pp: "eu"
            ),
            "aller": VerbDef(
                inf: "aller",
                pr: ["vais", "vas", "va", "allons", "allez", "vont"],
                pc: ["suis allé", "es allé", "est allé", "sommes allés", "êtes allés", "sont allés"],
                im: ["allais", "allais", "allait", "allions", "alliez", "allaient"],
                fu: ["irai", "iras", "ira", "irons", "irez", "iront"],
                co: ["irais", "irais", "irait", "irions", "iriez", "iraient"],
                pp: "allé"
            ),
            "faire": VerbDef(
                inf: "faire",
                pr: ["fais", "fais", "fait", "faisons", "faites", "font"],
                pc: ["ai fait", "as fait", "a fait", "avons fait", "avez fait", "ont fait"],
                im: ["faisais", "faisais", "faisait", "faisions", "faisiez", "faisaient"],
                fu: ["ferai", "feras", "fera", "ferons", "ferez", "feront"],
                co: ["ferais", "ferais", "ferait", "ferions", "feriez", "feraient"],
                pp: "fait"
            ),
        ]),
        "irr2": VerbGroup(label: "Verbes irréguliers — Groupe 2", list: [
            "dire": VerbDef(
                inf: "dire",
                pr: ["dis", "dis", "dit", "disons", "dites", "disent"],
                pc: ["ai dit", "as dit", "a dit", "avons dit", "avez dit", "ont dit"],
                im: ["disais", "disais", "disait", "disions", "disiez", "disaient"],
                fu: ["dirai", "diras", "dira", "dirons", "direz", "diront"],
                co: ["dirais", "dirais", "dirait", "dirions", "diriez", "diraient"],
                pp: "dit"
            ),
            "venir": VerbDef(
                inf: "venir",
                pr: ["viens", "viens", "vient", "venons", "venez", "viennent"],
                pc: ["suis venu", "es venu", "est venu", "sommes venus", "êtes venus", "sont venus"],
                im: ["venais", "venais", "venait", "venions", "veniez", "venaient"],
                fu: ["viendrai", "viendras", "viendra", "viendrons", "viendrez", "viendront"],
                co: ["viendrais", "viendrais", "viendrait", "viendrions", "viendriez", "viendraient"],
                pp: "venu"
            ),
            "pouvoir": VerbDef(
                inf: "pouvoir",
                pr: ["peux", "peux", "peut", "pouvons", "pouvez", "peuvent"],
                pc: ["ai pu", "as pu", "a pu", "avons pu", "avez pu", "ont pu"],
                im: ["pouvais", "pouvais", "pouvait", "pouvions", "pouviez", "pouvaient"],
                fu: ["pourrai", "pourras", "pourra", "pourrons", "pourrez", "pourront"],
                co: ["pourrais", "pourrais", "pourrait", "pourrions", "pourriez", "pourraient"],
                pp: "pu"
            ),
            "vouloir": VerbDef(
                inf: "vouloir",
                pr: ["veux", "veux", "veut", "voulons", "voulez", "veulent"],
                pc: ["ai voulu", "as voulu", "a voulu", "avons voulu", "avez voulu", "ont voulu"],
                im: ["voulais", "voulais", "voulait", "voulions", "vouliez", "voulaient"],
                fu: ["voudrai", "voudras", "voudra", "voudrons", "voudrez", "voudront"],
                co: ["voudrais", "voudrais", "voudrait", "voudrions", "voudriez", "voudraient"],
                pp: "voulu"
            ),
        ]),
        "irr3": VerbGroup(label: "Verbes irréguliers — Groupe 3", list: [
            "savoir": VerbDef(
                inf: "savoir",
                pr: ["sais", "sais", "sait", "savons", "savez", "savent"],
                pc: ["ai su", "as su", "a su", "avons su", "avez su", "ont su"],
                im: ["savais", "savais", "savait", "savions", "saviez", "savaient"],
                fu: ["saurai", "sauras", "saura", "saurons", "saurez", "sauront"],
                co: ["saurais", "saurais", "saurait", "saurions", "sauriez", "sauraient"],
                pp: "su"
            ),
        ]),
    ]

    // MARK: - French Phonetic Normalization

    static func frenchSound(_ word: String) -> String {
        var s = word.lowercased()
            .folding(options: .diacriticInsensitive, locale: Locale(identifier: "fr"))
            .trimmingCharacters(in: .whitespacesAndNewlines)

        // Remove non-alpha except §
        s = s.filter { $0.isLetter || $0 == "§" }

        // Phonetic replacements (order matters)
        let replacements: [(String, String)] = [
            ("aient", "§E"), ("ais", "§E"), ("ait", "§E"),
            ("ions", "§ION"),
            ("iez", "§IE"),
            ("rons", "§RON"), ("ront", "§RON"),
            ("rez", "§RE"), ("rai", "§RE"),
            ("ras", "§RA"), ("ra", "§RA"),
            ("ons", "§ON"),
            ("ez", "§EZ"),
        ]

        for (suffix, replacement) in replacements {
            if s.hasSuffix(suffix) {
                s = String(s.dropLast(suffix.count)) + replacement
                break
            }
        }

        // Strip silent endings
        if s.count > 4 && s.hasSuffix("ent") {
            s = String(s.dropLast(3))
        }
        if s.hasSuffix("es") {
            s = String(s.dropLast(2))
        } else if s.hasSuffix("e") {
            s = String(s.dropLast(1))
        }
        if let last = s.last, "stxd".contains(last) {
            s = String(s.dropLast(1))
        }

        return s
    }

    // MARK: - Generate Question

    static func makeQuestion(
        activeTenses: Set<String>,
        activeGroups: Set<String>
    ) -> Question? {
        // Collect eligible verbs
        var eligible: [(gKey: String, vKey: String, verbDef: VerbDef)] = []
        for (gKey, group) in verbs {
            guard activeGroups.contains(gKey) else { continue }
            for (vKey, verbDef) in group.list {
                eligible.append((gKey, vKey, verbDef))
            }
        }
        guard !eligible.isEmpty else { return nil }

        let tenseList = Array(activeTenses.filter { tenseKeys.contains($0) })
        guard !tenseList.isEmpty else { return nil }

        // Random selection
        let entry = eligible.randomElement()!
        let tense = tenseList.randomElement()!
        let pronIdx = Int.random(in: 0...5)

        guard let forms = entry.verbDef.tense(tense),
              pronIdx < forms.count else { return nil }

        let correct = forms[pronIdx].trimmingCharacters(in: .whitespaces)
        let correctSound = frenchSound(correct)

        // Collect all forms from this verb for distractors
        var seen = Set([correct.lowercased()])
        struct CandidateForm {
            let value: String
            let tense: String
            let pronIdx: Int
            let sound: String
        }

        var allForms: [CandidateForm] = []
        for t in tenseKeys {
            guard let arr = entry.verbDef.tense(t) else { continue }
            for p in 0..<6 {
                guard p < arr.count else { continue }
                let value = arr[p].trimmingCharacters(in: .whitespaces)
                guard !value.isEmpty else { continue }
                let k = value.lowercased()
                guard !seen.contains(k) else { continue }
                seen.insert(k)
                allForms.append(CandidateForm(value: value, tense: t, pronIdx: p, sound: frenchSound(value)))
            }
        }

        let homophones = allForms.filter { $0.sound == correctSound }
        let diffSounds = allForms.filter { $0.sound != correctSound }

        var distractors: [String] = []

        // Priority 1: first homophone
        if let first = homophones.first {
            distractors.append(first.value)
        }

        // Priority 2: different sounds, prefer other tenses
        let prioritizedDiff = diffSounds.sorted { a, b in
            let aOther = a.tense != tense ? 0 : 1
            let bOther = b.tense != tense ? 0 : 1
            if aOther != bOther { return aOther < bOther }
            return a.sound < b.sound
        }

        var usedSounds = Set<String>()
        for cand in prioritizedDiff {
            if distractors.count >= 3 { break }
            if usedSounds.contains(cand.sound) { continue }
            if !distractors.contains(cand.value) {
                distractors.append(cand.value)
                usedSounds.insert(cand.sound)
            }
        }

        // Priority 3: remaining homophones
        for cand in (prioritizedDiff + homophones) {
            if distractors.count >= 3 { break }
            if !distractors.contains(cand.value) {
                distractors.append(cand.value)
            }
        }

        // Priority 4: past participle
        let pp = entry.verbDef.pp.trimmingCharacters(in: .whitespaces)
        if distractors.count < 3 && !pp.isEmpty && pp.lowercased() != correct.lowercased() && !distractors.contains(pp) {
            distractors.append(pp)
        }

        // Priority 5: fallback from all verbs
        if distractors.count < 3 {
            var fallbackPool: [String] = []
            for group in verbs.values {
                for verbDef in group.list.values {
                    for t in tenseKeys {
                        if let arr = verbDef.tense(t) {
                            fallbackPool.append(contentsOf: arr)
                        }
                    }
                    fallbackPool.append(verbDef.pp)
                }
            }
            fallbackPool.shuffle()
            for candidate in fallbackPool {
                let value = candidate.trimmingCharacters(in: .whitespaces)
                if value.isEmpty || value == correct || distractors.contains(value) { continue }
                distractors.append(value)
                if distractors.count >= 3 { break }
            }
        }

        var options = [correct] + Array(distractors.prefix(3))
        options.shuffle()

        return Question(
            gKey: entry.gKey,
            vKey: entry.vKey,
            tense: tense,
            tenseLabel: tenseLabels[tense] ?? tense,
            pronIdx: pronIdx,
            correct: correct,
            options: options
        )
    }
}
