const pool = require('../db');
const { normalizeTasks } = require('./goalProgress');

const TRIFECTA_CATEGORIES = ['health', 'wealth', 'relationships'];
const TRIFECTA_AWARD_ID = 'trifecta';

// Categories the author has at least one *completed* goal in — same rule
// as a single Goal Trophy (see postsController.achievements()), just
// rolled up across every tag instead of one.
async function completedGoalCategories(authorId) {
  const [postRows] = await pool.query(
    "SELECT tag, category FROM posts WHERE author_id = ? AND tag IS NOT NULL AND tag <> ''",
    [authorId]
  );
  const countsByTag = new Map();
  for (const r of postRows) {
    const counts = countsByTag.get(r.tag) || {};
    counts[r.category] = (counts[r.category] || 0) + 1;
    countsByTag.set(r.tag, counts);
  }

  const [goalRows] = await pool.query('SELECT tag, subtasks FROM goals WHERE author_id = ?', [authorId]);
  const categories = new Set();
  for (const g of goalRows) {
    const subtasks = normalizeTasks(g.subtasks);
    const completed = subtasks.length > 0 && subtasks.every((t) => t.done);
    const counts = countsByTag.get(g.tag);
    if (completed && counts) {
      categories.add(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
    }
  }
  return categories;
}

async function trifectaStatus(authorId) {
  const [rows] = await pool.query(
    'SELECT earned_at FROM special_awards WHERE user_id = ? AND award_id = ?',
    [authorId, TRIFECTA_AWARD_ID]
  );
  if (rows.length) return { earned: true, earnedAt: new Date(rows[0].earned_at).getTime() };
  return { earned: false, earnedAt: null };
}

// Call right after a goal check-in might have just completed a goal.
// Persists the award (once, via the primary key) the first time all three
// categories have a completed goal — later calls are cheap no-ops once
// it's already recorded.
async function checkAndAwardTrifecta(userId) {
  const [existing] = await pool.query(
    'SELECT 1 FROM special_awards WHERE user_id = ? AND award_id = ?',
    [userId, TRIFECTA_AWARD_ID]
  );
  if (existing.length) return false;

  const categories = await completedGoalCategories(userId);
  if (!TRIFECTA_CATEGORIES.every((c) => categories.has(c))) return false;

  const [result] = await pool.query(
    'INSERT IGNORE INTO special_awards (user_id, award_id) VALUES (?, ?)',
    [userId, TRIFECTA_AWARD_ID]
  );
  return result.affectedRows > 0;
}

module.exports = { TRIFECTA_CATEGORIES, TRIFECTA_AWARD_ID, completedGoalCategories, trifectaStatus, checkAndAwardTrifecta };
