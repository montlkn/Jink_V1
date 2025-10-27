type PrimitiveRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is PrimitiveRecord =>
  typeof value === "object" && value !== null;

export function toUiProfile(raw: unknown) {
  const profile = isRecord(raw) ? raw : {};
  const name =
    typeof profile.name === "string"
      ? profile.name
      : typeof profile.full_name === "string"
      ? profile.full_name
      : typeof profile.username === "string"
      ? profile.username
      : "Unknown";

  return {
    name,
  };
}

export function toUiTaste(raw: unknown) {
  const source = isRecord(raw) ? raw : {};
  const text = typeof source.text === "string" ? source.text : "";
  const title =
    typeof source.title === "string" && source.title.length
      ? source.title
      : text || "No summary";

  return {
    title,
    text,
  };
}

export function toUiQuests(raw: unknown) {
  if (Array.isArray(raw)) {
    return { activeCount: raw.length };
  }

  return { activeCount: 0 };
}
