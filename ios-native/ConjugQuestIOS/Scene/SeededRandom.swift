import Foundation

/// Mulberry32 seeded PRNG — identical to the JS version for reproducible levels.
struct SeededRandom {
    private var state: UInt32

    init(seed: UInt32) {
        self.state = seed
    }

    /// Returns a random Float64 in [0, 1).
    mutating func next() -> Double {
        state &+= 0x6D2B79F5
        var t = UInt64(state) * UInt64(state ^ (state >> 15))
        t = (t & 0xFFFFFFFF) ^ ((t >> 16) & 0xFFFFFFFF)
        // Simplified mulberry32
        state &+= 0x6D2B79F5
        var z = state
        z = (z ^ (z >> 16)) &* 0x45d9f3b
        z = (z ^ (z >> 16)) &* 0x45d9f3b
        z = z ^ (z >> 16)
        return Double(z) / Double(UInt64(UInt32.max) + 1)
    }

    /// Returns a random CGFloat in [0, 1).
    mutating func nextCGFloat() -> CGFloat {
        CGFloat(next())
    }

    /// Returns a random integer in [min, max] inclusive.
    mutating func nextInt(min: Int, max: Int) -> Int {
        guard max >= min else { return min }
        return min + Int(next() * Double(max - min + 1))
    }

    /// Returns a random element from an array.
    mutating func pick<T>(from array: [T]) -> T? {
        guard !array.isEmpty else { return nil }
        return array[nextInt(min: 0, max: array.count - 1)]
    }

    /// Shuffles an array in place.
    mutating func shuffle<T>(_ array: inout [T]) {
        for i in stride(from: array.count - 1, through: 1, by: -1) {
            let j = nextInt(min: 0, max: i)
            array.swapAt(i, j)
        }
    }

    /// Creates a seed from current timestamp.
    static func createRunSeed() -> UInt32 {
        let time = UInt32(Date().timeIntervalSince1970 * 1000) & 0xFFFFFFFF
        let random = UInt32.random(in: 0...UInt32.max)
        return time ^ random
    }
}
