export const COLORS = {
  primary: "#1A237E",
  accent: "#FF6F00",
  background: "#F5F5F5",
  text: "#212121",
  card: "#FFFFFF",
} as const;

export type ColorToken = keyof typeof COLORS;

export default COLORS;
