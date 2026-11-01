export function awardStars(days) {
  const target = Math.max(1, Math.floor(Number(days) || 1));
  return target < 10 ? 1 : target <= 20 ? 2 : target <= 30 ? 3 : 4;
}
