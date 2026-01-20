export const DESIGNER_REPUBLIC_THEME = {
    colors: {
        // Base colors
        background: "#DEDEDE", // Light grey technical background
        text: "#111111", // Stark black text
        primary: "#FF4400", // Wipeout-style orange/red (slightly adjusted for light mode)
        secondary: "#00AEEF", // Cyan/Electric Blue (slightly darker for contrast)
        accent: "#76B900", // Acid Green (darkened for visibility on white)
        surface: "#FFFFFF", // White surface
        border: "#D1D1D1", // Light grey border
        muted: "#888888", // Medium grey for muted text

        // Semantic colors
        success: "#76B900", // Maps to accent green
        warning: "#FF4400", // Maps to primary orange
        error: "#C62828", // Red for errors
        info: "#00AEEF", // Maps to secondary blue

        // Standard colors (eliminates hardcoded variations)
        white: "#FFFFFF",
        black: "#000000",

        // Tab colors (standardized)
        tabActive: "#007AFF", // iOS-style blue for active tabs
        tabInactive: "#333333", // Dark grey for inactive tabs

        // Quest-specific colors
        questDaily: "#FF4400", // Primary orange for daily quests
        questWeekly: "#00AEEF", // Secondary blue for weekly quests

        // Common rgba patterns
        overlay: "rgba(0, 0, 0, 0.4)",
        cardBackground: "rgba(255, 255, 255, 0.2)",
        highlightBg: "rgba(236, 245, 255, 0.13)",
        shadowLight: "rgba(0, 0, 0, 0.1)",
        shadowMedium: "rgba(0, 0, 0, 0.15)",
    },
    typography: {
        fontFamily: {
            bold: "System",
            regular: "System",
            monospace: "Courier", // For code/technical displays
        },
        fontSize: {
            xxxs: 9, // Added for tiny metadata
            xxs: 8, // Added for labels
            xs: 10,
            xsPlus: 11, // Added for specific UI elements
            sm: 12,
            smPlus: 13, // Added for intermediate sizes
            md: 14,
            mdPlus: 15, // Added for intermediate sizes
            base: 16, // Added as common body text size
            lg: 18,
            lgPlus: 20, // Added for modal titles and section headers
            xlg: 22, // Added for larger headings
            xl: 24,
            xxl: 32,
            xxxl: 36, // Display numbers (passport stats)
            xxxxl: 48, // Hero display text
        },
        letterSpacing: {
            tight: -0.5,
            normal: 0,
            wide: 1.5,
            widest: 3.0,
        },
    },
    spacing: {
        xxs: 2, // Added for minimal spacing
        xs: 4,
        sm: 8,
        md: 12, // Added intermediate value
        base: 16,
        lg: 20, // Added intermediate value
        xl: 24,
        xxl: 32,
        xxxl: 40, // Added for large spacing
        xxxxl: 48, // Added for extra large spacing
    },
    layout: {
        borderRadius: {
            none: 0, // Sharp corners for Designer Republic aesthetic
            sm: 2,
            md: 4,
            lg: 8,
            xl: 12, // Common for cards
            xxl: 16,
            xxxl: 20, // For modals
            pill: 100, // For pill-shaped buttons
            circle: 9999, // For circular elements
        },
        borderWidth: {
            thin: 1,
            medium: 2, // Common for card borders
            thick: 4, // For accent left borders
        },
    },
};
