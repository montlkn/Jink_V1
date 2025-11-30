/**
 * Glow presets for react-native-animated-glow
 */
import type { PresetConfig } from "react-native-animated-glow";

/**
 * Warm golden glow for HomeTasteLine card
 */
export const showtime: PresetConfig = {
    states: [
        {
            name: "default",
            preset: {
                cornerRadius: 10,
                outlineWidth: 2,
                borderColor: "rgba(209, 209, 209, 1)",
                backgroundColor: "#222",
                animationSpeed: 0.5,
                borderSpeedMultiplier: 1,
                glowLayers: [
                    {
                        glowPlacement: "behind",
                        colors: ["rgba(107, 107, 107, 0.8)"],
                        glowSize: [15, 8],
                        opacity: 0.5,
                        speedMultiplier: 1,
                        coverage: 1,
                        relativeOffset: 0,
                    },
                    {
                        glowPlacement: "behind",
                        colors: [
                            "rgba(50, 50, 50, 0.8)",
                            "rgba(60, 60, 60, 0.6)",
                        ],
                        glowSize: [3, 2, 2, 3],
                        opacity: 0.6,
                        speedMultiplier: 1,
                        coverage: 1,
                        relativeOffset: 0,
                    },
                    {
                        glowPlacement: "behind",
                        colors: ["rgba(45, 45, 45, 0.7)"],
                        glowSize: [0, 10],
                        opacity: 0.5,
                        speedMultiplier: 1,
                        coverage: 0.5,
                        relativeOffset: 0,
                    },
                    {
                        glowPlacement: "over",
                        colors: ["rgba(60, 60, 60, 0.9)"],
                        glowSize: [0, 1],
                        opacity: 0.8,
                        speedMultiplier: 1,
                        coverage: 0.6,
                        relativeOffset: 0,
                    },
                ],
            },
        },
        {
            name: "hover",
            transition: 300,
            preset: {
                animationSpeed: 3,
                glowLayers: [
                    {
                        glowSize: [40, 24],
                        opacity: 0.12,
                    },
                    {
                        glowSize: [6, 5, 5, 6],
                        opacity: 0.24,
                    },
                    {
                        glowSize: [0, 24],
                        opacity: 0.12,
                    },
                    {
                        glowSize: [0, 2],
                        opacity: 1,
                    },
                ],
            },
        },
        {
            name: "press",
            transition: 100,
            preset: {
                animationSpeed: 4,
                glowLayers: [
                    {
                        glowSize: [40, 28],
                        opacity: 0.14,
                    },
                    {
                        glowSize: [7, 6, 6, 7],
                        opacity: 0.28,
                    },
                    {
                        glowSize: [0, 28],
                        opacity: 0.14,
                    },
                    {
                        glowSize: [0, 3],
                        opacity: 1,
                    },
                ],
            },
        },
    ],
};

/**
 * Light blue-grey circular border glow for orb on WalkStart screen
 */
/**
 * Soft diffuse glow for orb on WalkStart screen (matches showtime style)
 */
export const orbWalk: PresetConfig = {
    states: [
        {
            name: "default",
            preset: {
                cornerRadius: 999,
                outlineWidth: 0, // No sharp outline
                borderColor: "transparent",
                backgroundColor: "transparent",
                animationSpeed: 0.5,
                borderSpeedMultiplier: 1,
                glowLayers: [
                    {
                        glowPlacement: "behind",
                        colors: ["rgba(180, 200, 220, 0.6)"],
                        glowSize: [40, 20], // Large diffuse backing
                        opacity: 0.5,
                        speedMultiplier: 1,
                        coverage: 1,
                        relativeOffset: 0,
                    },
                    {
                        glowPlacement: "behind",
                        colors: [
                            "rgba(160, 180, 200, 0.5)",
                            "rgba(140, 160, 185, 0.4)",
                        ],
                        glowSize: [15, 10, 10, 15], // Mid-range pulse
                        opacity: 0.6,
                        speedMultiplier: 1,
                        coverage: 1,
                        relativeOffset: 0,
                    },
                    {
                        glowPlacement: "behind",
                        colors: ["rgba(190, 210, 230, 0.4)"],
                        glowSize: [0, 30], // Wide outer halo
                        opacity: 0.4,
                        speedMultiplier: 1,
                        coverage: 0.8,
                        relativeOffset: 0,
                    },
                    {
                        glowPlacement: "over",
                        colors: ["rgba(200, 220, 240, 0.3)"],
                        glowSize: [0, 5], // Subtle top highlight
                        opacity: 0.3,
                        speedMultiplier: 1,
                        coverage: 1,
                        relativeOffset: 0,
                    },
                ],
            },
        },
    ],
};
