import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { useMemo } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";

type PassportBackdropProps = {
  height?: number;
  tailColor?: string;
};

/**
 * Reusable passport banner gradient that mirrors the home header fade.
 * The navy top recedes into a transparent tail so screens inherit their parchment backgrounds without seams.
 */
export function PassportBackdrop({
  height = 200,
  tailColor = theme.colors.background,
}: PassportBackdropProps) {
  const gradient = useMemo(() => {
    const parsedTail = toRgb(tailColor) ?? { r: 246, g: 241, b: 231 };
    const tailFeather = toRgba(parsedTail, 0.28);
    const tailSoft = toRgba(parsedTail, 0.14);
    const tailVeil = toRgba(parsedTail, 0.04);

    return {
      colors: [
        "rgba(18, 27, 41, 0.96)",
        "rgba(27, 41, 61, 0.82)",
        "rgba(38, 56, 82, 0.64)",
        tailFeather,
        tailSoft,
        tailVeil,
        toRgba(parsedTail, 0),
      ] as const,
      locations: [0, 0.24, 0.48, 0.7, 0.86, 0.95, 1] as const,
    };
  }, [tailColor]);

  return (
    <LinearGradient
      colors={gradient.colors}
      locations={gradient.locations}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.backdrop, { height }]}
      pointerEvents="none"
    />
  );
}

type Rgb = { r: number; g: number; b: number };

function toRgba(rgb: Rgb, alpha: number): string {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function toRgb(color: string): Rgb | null {
  if (!color) return null;
  const trimmed = color.trim();
  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
    }
    return null;
  }

  const rgbMatch = trimmed.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*[\d.]+\s*)?\)$/i);
  if (rgbMatch) {
    const r = Number(rgbMatch[1]);
    const g = Number(rgbMatch[2]);
    const b = Number(rgbMatch[3]);
    return Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)
      ? { r: Math.round(r), g: Math.round(g), b: Math.round(b) }
      : null;
  }

  return null;
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
});

export default PassportBackdrop;
