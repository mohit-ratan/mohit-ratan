export function awardStars(days) {
  const target = Math.max(1, Math.floor(Number(days) || 1));
  return target <= 7 ? 1 : target <= 15 ? 2 : 2 + Math.ceil((target - 15) / 15);
}
