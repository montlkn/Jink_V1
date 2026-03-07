import SwiftUI

struct LevelConfig {
    let level: Int
    let xpRequired: Int
    let cumulativeXp: Int
    let title: String
    let tier: String // 'explorer', 'connoisseur', 'authority', 'mythic'
}

// 50-level system with 4 tiers
let XP_LEVELS: [LevelConfig] = [
    // TIER 1: EXPLORER (Levels 1-10)
    LevelConfig(level: 1, xpRequired: 0, cumulativeXp: 0, title: "Newcomer", tier: "explorer"),
    LevelConfig(level: 2, xpRequired: 100, cumulativeXp: 100, title: "Observer", tier: "explorer"),
    LevelConfig(level: 3, xpRequired: 400, cumulativeXp: 500, title: "Wanderer", tier: "explorer"),
    LevelConfig(level: 4, xpRequired: 900, cumulativeXp: 1400, title: "Scout", tier: "explorer"),
    LevelConfig(level: 5, xpRequired: 1600, cumulativeXp: 3000, title: "Enthusiast", tier: "explorer"),
    LevelConfig(level: 6, xpRequired: 2500, cumulativeXp: 5500, title: "Admirer", tier: "explorer"),
    LevelConfig(level: 7, xpRequired: 3600, cumulativeXp: 9100, title: "Student", tier: "explorer"),
    LevelConfig(level: 8, xpRequired: 4900, cumulativeXp: 14000, title: "Apprentice", tier: "explorer"),
    LevelConfig(level: 9, xpRequired: 6400, cumulativeXp: 20400, title: "Explorer", tier: "explorer"),
    LevelConfig(level: 10, xpRequired: 8100, cumulativeXp: 28500, title: "Pathfinder", tier: "explorer"),

    // TIER 2: CONNOISSEUR (Levels 11-20)
    LevelConfig(level: 11, xpRequired: 10000, cumulativeXp: 38500, title: "Connoisseur", tier: "connoisseur"),
    LevelConfig(level: 12, xpRequired: 12100, cumulativeXp: 50600, title: "Specialist", tier: "connoisseur"),
    LevelConfig(level: 13, xpRequired: 14400, cumulativeXp: 65000, title: "Researcher", tier: "connoisseur"),
    LevelConfig(level: 14, xpRequired: 16900, cumulativeXp: 81900, title: "Documentarian", tier: "connoisseur"),
    LevelConfig(level: 15, xpRequired: 19600, cumulativeXp: 101500, title: "Chronicler", tier: "connoisseur"),
    LevelConfig(level: 16, xpRequired: 22500, cumulativeXp: 124000, title: "Curator", tier: "connoisseur"),
    LevelConfig(level: 17, xpRequired: 25600, cumulativeXp: 149600, title: "Scholar", tier: "connoisseur"),
    LevelConfig(level: 18, xpRequired: 28900, cumulativeXp: 178500, title: "Expert", tier: "connoisseur"),
    LevelConfig(level: 19, xpRequired: 32400, cumulativeXp: 210900, title: "Archivist", tier: "connoisseur"),
    LevelConfig(level: 20, xpRequired: 36100, cumulativeXp: 247000, title: "Historian", tier: "connoisseur"),

    // TIER 3: AUTHORITY (Levels 21-30)
    LevelConfig(level: 21, xpRequired: 40000, cumulativeXp: 287000, title: "Authority", tier: "authority"),
    LevelConfig(level: 22, xpRequired: 44100, cumulativeXp: 331100, title: "Mentor", tier: "authority"),
    LevelConfig(level: 23, xpRequired: 48400, cumulativeXp: 379500, title: "Master", tier: "authority"),
    LevelConfig(level: 24, xpRequired: 52900, cumulativeXp: 432400, title: "Architect's Eye", tier: "authority"),
    LevelConfig(level: 25, xpRequired: 57600, cumulativeXp: 490000, title: "Guardian", tier: "authority"),
    LevelConfig(level: 26, xpRequired: 62500, cumulativeXp: 552500, title: "Advocate", tier: "authority"),
    LevelConfig(level: 27, xpRequired: 67600, cumulativeXp: 620100, title: "Ambassador", tier: "authority"),
    LevelConfig(level: 28, xpRequired: 72900, cumulativeXp: 693000, title: "Luminary", tier: "authority"),
    LevelConfig(level: 29, xpRequired: 78400, cumulativeXp: 771400, title: "Visionary", tier: "authority"),
    LevelConfig(level: 30, xpRequired: 84100, cumulativeXp: 855500, title: "Legend", tier: "authority"),

    // TIER 4: MYTHIC (Levels 31-50)
    LevelConfig(level: 31, xpRequired: 90000, cumulativeXp: 945500, title: "Mythmaker", tier: "mythic"),
    LevelConfig(level: 32, xpRequired: 96100, cumulativeXp: 1041600, title: "Iconoclast", tier: "mythic"),
    LevelConfig(level: 33, xpRequired: 102400, cumulativeXp: 1144000, title: "Vanguard", tier: "mythic"),
    LevelConfig(level: 34, xpRequired: 108900, cumulativeXp: 1252900, title: "Paragon", tier: "mythic"),
    LevelConfig(level: 35, xpRequired: 115600, cumulativeXp: 1368500, title: "Monument", tier: "mythic"),
    LevelConfig(level: 36, xpRequired: 122500, cumulativeXp: 1491000, title: "Touchstone", tier: "mythic"),
    LevelConfig(level: 37, xpRequired: 129600, cumulativeXp: 1620600, title: "Keystone", tier: "mythic"),
    LevelConfig(level: 38, xpRequired: 136900, cumulativeXp: 1757500, title: "Cornerstone", tier: "mythic"),
    LevelConfig(level: 39, xpRequired: 144400, cumulativeXp: 1901900, title: "Foundation", tier: "mythic"),
    LevelConfig(level: 40, xpRequired: 152100, cumulativeXp: 2054000, title: "Pillar", tier: "mythic"),
    LevelConfig(level: 41, xpRequired: 160000, cumulativeXp: 2214000, title: "Bedrock", tier: "mythic"),
    LevelConfig(level: 42, xpRequired: 168100, cumulativeXp: 2382100, title: "Eternal", tier: "mythic"),
    LevelConfig(level: 43, xpRequired: 176400, cumulativeXp: 2558500, title: "Timeless", tier: "mythic"),
    LevelConfig(level: 44, xpRequired: 184900, cumulativeXp: 2743400, title: "Ageless", tier: "mythic"),
    LevelConfig(level: 45, xpRequired: 193600, cumulativeXp: 2937000, title: "Oracle", tier: "mythic"),
    LevelConfig(level: 46, xpRequired: 202500, cumulativeXp: 3139500, title: "Sage", tier: "mythic"),
    LevelConfig(level: 47, xpRequired: 211600, cumulativeXp: 3351100, title: "Seer", tier: "mythic"),
    LevelConfig(level: 48, xpRequired: 220900, cumulativeXp: 3572000, title: "Prophet", tier: "mythic"),
    LevelConfig(level: 49, xpRequired: 230400, cumulativeXp: 3802400, title: "Deity", tier: "mythic"),
    LevelConfig(level: 50, xpRequired: 240100, cumulativeXp: 4042500, title: "Immortal", tier: "mythic"),
]

func getLevelFromXP(_ totalXP: Int) -> Int {
    guard totalXP >= 0 else { return 1 }

    for i in stride(from: XP_LEVELS.count - 1, through: 0, by: -1) {
        if totalXP >= XP_LEVELS[i].cumulativeXp {
            return XP_LEVELS[i].level
        }
    }
    return 1
}

func getLevelConfig(_ level: Int) -> LevelConfig {
    if let config = XP_LEVELS.first(where: { $0.level == level }) {
        return config
    }
    if level > XP_LEVELS.last?.level ?? 50 {
        return XP_LEVELS.last ?? XP_LEVELS[0]
    }
    return XP_LEVELS[0]
}

func getLevelTitle(_ level: Int) -> String {
    getLevelConfig(level).title
}

func getLevelTier(_ level: Int) -> String {
    getLevelConfig(level).tier
}

struct XPProgress {
    let currentLevel: Int
    let currentTitle: String
    let currentTier: String
    let nextLevel: Int
    let nextTitle: String
    let xpInLevel: Int
    let xpNeeded: Int
    let progressPercent: Double
}

func getProgressToNextLevel(_ totalXP: Int) -> XPProgress {
    let currentLevel = getLevelFromXP(totalXP)
    let currentConfig = getLevelConfig(currentLevel)
    let nextConfig = getLevelConfig(currentLevel + 1)

    let xpInLevel = totalXP - currentConfig.cumulativeXp
    let xpNeeded = nextConfig.xpRequired
    let progressPercent = xpNeeded > 0 ? Double(xpInLevel) / Double(xpNeeded) * 100 : 0

    return XPProgress(
        currentLevel: currentLevel,
        currentTitle: currentConfig.title,
        currentTier: currentConfig.tier,
        nextLevel: nextConfig.level,
        nextTitle: nextConfig.title,
        xpInLevel: xpInLevel,
        xpNeeded: xpNeeded,
        progressPercent: min(max(progressPercent, 0), 100)
    )
}

func getTierColor(_ tier: String) -> Color {
    switch tier {
    case "explorer":
        return Color(hex: "#10b981") // Green
    case "connoisseur":
        return Color(hex: "#3b82f6") // Blue
    case "authority":
        return Color(hex: "#a855f7") // Purple
    case "mythic":
        return Color(hex: "#f59e0b") // Gold
    default:
        return Color(hex: "#6b7280") // Gray
    }
}
