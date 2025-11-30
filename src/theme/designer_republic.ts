export const DESIGNER_REPUBLIC_THEME = {
    colors: {
        background: "#DEDEDE", // Light grey technical background
        text: "#111111", // Stark black text
        primary: "#FF4400", // Wipeout-style orange/red (slightly adjusted for light mode)
        secondary: "#00AEEF", // Cyan/Electric Blue (slightly darker for contrast)
        accent: "#76B900", // Acid Green (darkened for visibility on white)
        surface: "#FFFFFF", // White surface
        border: "#D1D1D1", // Light grey border
        muted: "#888888", // Medium grey for muted text
    },
    typography: {
        fontFamily: {
            bold: "System",
            regular: "System",
        },
        fontSize: {
            xs: 10,
            sm: 12,
            md: 14,
            lg: 18,
            xl: 24,
            xxl: 32,
        },
        letterSpacing: {
            tight: -0.5,
            normal: 0,
            wide: 1.5,
            widest: 3.0,
        },
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    layout: {
        borderRadius: {
            sm: 0, // Sharp corners for more technical feel
            md: 2,
            lg: 4,
        },
        borderWidth: {
            thin: 1,
            thick: 2,
        },
    },
};
