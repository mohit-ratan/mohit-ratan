// Plain Levenshtein distance — tags are short (<=24 chars), so no need for
// anything fancier than the textbook O(n*m) table.
function levenshtein(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// Finds an existing tag close enough to `tag` that it was probably meant
// to be the same one (a typo, a plural, a different word order) rather
// than a deliberate new goal — used to nudge someone back to continuing
// their existing goal instead of silently starting an unrelated one.
export function findSimilarTag(tag, existingTags) {
  if (!tag) return null;
  let best = null;
  for (const existing of existingTags) {
    if (existing === tag) continue;
    const distance = levenshtein(tag, existing);
    const threshold = tag.length <= 4 || existing.length <= 4 ? 1 : 2;
    // Catches "gym" -> "gymday" too — a suffix tacked on has a large edit
    // distance but is still an obvious continuation of the shorter tag.
    const isPrefixMatch = tag.length >= 3 && existing.length >= 3 && (tag.startsWith(existing) || existing.startsWith(tag));
    if ((distance <= threshold || isPrefixMatch) && (!best || distance < best.distance)) {
      best = { tag: existing, distance: isPrefixMatch ? Math.min(distance, threshold) : distance };
    }
  }
  return best?.tag || null;
}
