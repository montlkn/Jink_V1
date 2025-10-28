export function getXpForNextLevel(currentLevel: number): number {
  const safeLevel = Number.isFinite(currentLevel) && currentLevel > 0 ? currentLevel : 1;
  return Math.pow(safeLevel, 2) * 100;
}

export function clampProgress(progress: number): number {
  if (!Number.isFinite(progress) || progress < 0) {
    return 0;
  }
  if (progress > 1) {
    return 1;
  }
  return progress;
}
