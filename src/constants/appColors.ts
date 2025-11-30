/**
 * App Color Constants
 * Centralized color definitions for consistent UI elements across the app
 */

export const APP_COLORS = {
    // Daily Streak / Daily Quest
    daily: "#FF4400", // Orange/Red from theme.colors.primary

    // Weekly elements
    weekly: "#00AEEF", // Cyan/Blue from theme.colors.secondary

    // XP / Experience
    xp: "#00AEEF", // Blue - consistent across passport and home

    // Achievement / Completion
    achievement: "#76B900", // Acid Green from theme.colors.accent

    // Generic success/positive
    success: "#76B900",

    // Warning
    warning: "#FF4400",

    // Error
    error: "#FF0000",

    // Passport specific
    passport: {
        streak: "#F50057", // Hot Pink - Distinct from Daily Quest
        visa: "#7B1FA2", // Deep Purple - Distinct from others
        stamp: "#DC143C", // Crimson Red
        list: "#FFC107", // Amber/Gold
        achievement: "#00C853", // Bright Green
        walk: "#E65100", // Burnt Orange
        bearer: "#607D8B", // Slate
    },

    // UI Elements
    elements: {
        backPill: "#000000",
        surface: "#FFFFFF",
        background: "#DEDEDE",
    },
};

export default APP_COLORS;
