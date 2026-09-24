const pool = require('../db');
const { normalizeTasks } = require('./goalProgress');

const TRIFECTA_CATEGORIES = ['health', 'wealth', 'relationships'];
const TRIFECTA_AWARD_ID = 'trifecta-45';
const { ensureMemberTables } = require('./memberFeatures');
const WINDOW_MS = 45 * 86400000;
function windowCategories(events, now = Date.now()) {
  return new Set(events.filter(e => Number(e.occurred_ms) >= now - WINDOW_MS && Number(e.occurred_ms) <= now).map(e => e.category).filter(c => TRIFECTA_CATEGORIES.includes(c)));
}
async function recentCategories(userId, now = Date.now()) {
  await ensureMemberTables();
  const [events] = await pool.query('SELECT category, occurred_ms FROM task_checkins WHERE user_id=? AND goal_completed=1 AND occurred_ms>=? AND occurred_ms<=?', [userId, now-WINDOW_MS, now]);
  return windowCategories(events, now);
}


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
  const categories = [...await recentCategories(authorId)];
  if (rows.length) return { earned: true, earnedAt: new Date(rows[0].earned_at).getTime(), categories };
  return { earned: false, earnedAt: null, categories };
}

// Call right after a goal check-in might have just completed a goal.
// Persists the award (once, via the primary key) the first time all three
// categories have recorded goal completions within 45 days — later calls are no-ops once
// it's already recorded.
async function checkAndAwardTrifecta(userId) {
  const [existing] = await pool.query(
    'SELECT 1 FROM special_awards WHERE user_id = ? AND award_id = ?',
    [userId, TRIFECTA_AWARD_ID]
  );
  if (existing.length) return false;

  const categories = await recentCategories(userId);
  if (!TRIFECTA_CATEGORIES.every((c) => categories.has(c))) return false;

  const [result] = await pool.query(
    'INSERT IGNORE INTO special_awards (user_id, award_id) VALUES (?, ?)',
    [userId, TRIFECTA_AWARD_ID]
  );
  return result.affectedRows > 0;
}

module.exports = { windowCategories, recentCategories, TRIFECTA_CATEGORIES, TRIFECTA_AWARD_ID, completedGoalCategories, trifectaStatus, checkAndAwardTrifecta };
