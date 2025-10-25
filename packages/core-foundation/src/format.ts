export function slugify(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}
