/**
 * Feature Flags Configuration
 *
 * Controls which features are enabled/disabled for V1 launch.
 * Used for gamification simplification and feature gating.
 *
 * Key decisions for V1:
 * - Visas: DISABLED (confusing, enable post-launch)
 * - Streaks: SIMPLIFIED (show count only, no elaborate modals)
 * - Quests: SIMPLIFIED (basic types only, reduced visual prominence)
 * - XP/Levels: SIMPLIFIED (visible but not dominant)
 * - Achievements: BASIC (simple achievements only)
 */

export interface FeatureFlags {
  // Core features
  scanning: boolean;
  walks: boolean;
  tours: boolean;
  contributions: boolean;

  // Gamification features
  quests: {
    enabled: boolean;
    showOnHomeScreen: boolean;
    complexQuestChains: boolean;
    dailyQuests: boolean;
    weeklyQuests: boolean;
  };
  xp: {
    enabled: boolean;
    showInHeader: boolean;
    levelUpModals: boolean;
  };
  streaks: {
    enabled: boolean;
    multiplierEnabled: boolean;
    milestoneModals: boolean;
  };
  visas: {
    enabled: boolean; // DISABLED for V1
    showInPassport: boolean;
    grantModals: boolean;
  };
  achievements: {
    enabled: boolean;
    complexAchievements: boolean;
    showPopups: boolean;
  };

  // UI features
  passport: {
    orb: boolean;
    aestheticProfile: boolean;
    stamps: boolean;
    lists: boolean; // DEFERRED for V1
  };
  maps: {
    nolliMap: boolean; // DEFERRED for V1
    miniRadar: boolean;
  };

  // Real estate listings
  listings: {
    enabled: boolean;
    showOnBuildingInfo: boolean;
    premiumEnabled: boolean;
  };

  // Debug features
  debug: {
    showPerformanceMetrics: boolean;
    showCacheStats: boolean;
    mockLocation: boolean;
  };
}

// V1 Launch Configuration
export const FEATURE_FLAGS: FeatureFlags = {
  // Core features - all enabled
  scanning: true,
  walks: true,
  tours: true,
  contributions: true,

  // Gamification - SIMPLIFIED
  quests: {
    enabled: false, // ARCHIVED for v1 - Quest feature removed
    showOnHomeScreen: false,
    complexQuestChains: false,
    dailyQuests: false,
    weeklyQuests: false,
  },
  xp: {
    enabled: true,
    showInHeader: false, // Keep in profile, not everywhere
    levelUpModals: false, // Just show badge, no celebration modal
  },
  streaks: {
    enabled: true,
    multiplierEnabled: true, // Keep for algorithm value
    milestoneModals: false, // Remove elaborate celebrations
  },
  visas: {
    enabled: false, // DISABLED for V1 - too confusing
    showInPassport: false,
    grantModals: false,
  },
  achievements: {
    enabled: true,
    complexAchievements: false, // Only simple achievements
    showPopups: false, // Subtle notifications only
  },

  // UI features
  passport: {
    orb: true,
    aestheticProfile: true,
    stamps: true,
    lists: false, // DEFERRED for V1
  },
  maps: {
    nolliMap: false, // DEFERRED - complex to fix
    miniRadar: true,
  },

  // Real estate listings
  listings: {
    enabled: true,
    showOnBuildingInfo: true,
    premiumEnabled: false, // Keep off until agents onboarded
  },

  // Debug
  debug: {
    showPerformanceMetrics: false,
    showCacheStats: false,
    mockLocation: false,
  },
};

// Helper functions for checking flags
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const value = FEATURE_FLAGS[feature];
  if (typeof value === 'boolean') {
    return value;
  }
  // For nested features, check if the main enabled flag is true
  if (typeof value === 'object' && 'enabled' in value) {
    return value.enabled;
  }
  return true;
}

export function getQuestFlags() {
  return FEATURE_FLAGS.quests;
}

export function getXPFlags() {
  return FEATURE_FLAGS.xp;
}

export function getStreakFlags() {
  return FEATURE_FLAGS.streaks;
}

export function getVisaFlags() {
  return FEATURE_FLAGS.visas;
}

export function getAchievementFlags() {
  return FEATURE_FLAGS.achievements;
}

export function getPassportFlags() {
  return FEATURE_FLAGS.passport;
}

export function getMapFlags() {
  return FEATURE_FLAGS.maps;
}

export function getListingsFlags() {
  return FEATURE_FLAGS.listings;
}

// Feature flag override for testing (not persisted)
let overrides: Partial<FeatureFlags> = {};

export function setFeatureOverride<K extends keyof FeatureFlags>(
  feature: K,
  value: FeatureFlags[K]
): void {
  overrides[feature] = value;
}

export function clearFeatureOverrides(): void {
  overrides = {};
}

export function getEffectiveFlags(): FeatureFlags {
  return { ...FEATURE_FLAGS, ...overrides };
}
