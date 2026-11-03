const CHEERS = ['🔥', '👏', '💪', '🙌', '🎯', '🎉'];
async function cheerCounts(db, postIds) {
  if (!postIds.length) return new Map();
  const [rows] = await db.query(`SELECT post_id, reaction, COUNT(*) AS count FROM post_reactions
    WHERE post_id IN (${postIds.map(() => '?').join(',')}) AND reaction IN (${CHEERS.map(() => '?').join(',')})
    GROUP BY post_id, reaction`, [...postIds, ...CHEERS]);
  const grouped = new Map(postIds.map(id => [id, []]));
  for (const row of rows) if (grouped.has(row.post_id)) grouped.get(row.post_id).push({ reaction: row.reaction, count: Number(row.count) });
  for (const items of grouped.values()) items.sort((a,b) => b.count - a.count || CHEERS.indexOf(a.reaction) - CHEERS.indexOf(b.reaction));
  return grouped;
}
module.exports = { cheerCounts };
