const pool = require('../db');
const { canView, getFollowStatus } = require('../lib/follows');
const { ensureMemberTables } = require('../lib/memberFeatures');
const { validTimeZone, calendarDay } = require('../lib/taskCelebration');
const { recapWindow, summarizeMonths } = require('../lib/monthlyRecap');

async function list(req, res) {
  try {
    const authorId = req.params.id;
    if (!await canView(req.userId, authorId)) return res.status(403).json({ error: 'This profile is private.' });
    const before = req.query.before;
    if (before !== undefined && (!/^\d{4}-(0[1-9]|1[0-2])$/.test(before) || before < '2000-01' || before > '9998-12')) {
      return res.status(400).json({ error: 'Choose a valid recap month.' });
    }
    await ensureMemberTables();
    const [preferences] = await pool.query('SELECT time_zone FROM member_preferences WHERE user_id = ?', [authorId]);
    const timeZone = validTimeZone(preferences[0]?.time_zone);
    const currentMonth = calendarDay(new Date(), timeZone).slice(0, 7);
    if (before && before > currentMonth) return res.status(400).json({ error: 'Future months are not available.' });
    const window = recapWindow(timeZone, before);
    const friendsVisible = req.userId === authorId || await getFollowStatus(req.userId, authorId) === 'accepted';
    const [rows] = await pool.query(`SELECT p.id, p.tag, p.category, p.created_at, p.media_url, p.media_type, p.crop_x, p.crop_y,
      ci.day_key,
      CASE WHEN ci.goal_completed = 1 AND NOT EXISTS (
        SELECT 1 FROM task_checkins earlier WHERE earlier.user_id = ci.user_id AND earlier.goal_tag = ci.goal_tag
        AND earlier.goal_completed = 1 AND (earlier.occurred_ms < ci.occurred_ms OR (earlier.occurred_ms = ci.occurred_ms AND earlier.post_id < ci.post_id))
      ) THEN 1 ELSE 0 END AS first_goal_completion
      FROM posts p LEFT JOIN task_checkins ci ON ci.post_id = p.id
      WHERE p.author_id = ? AND (p.visibility = 'public' OR ? = 1)
        AND p.created_at >= ? AND p.created_at < ? ORDER BY p.created_at ASC`,
    [authorId, friendsVisible ? 1 : 0, window.from, window.to]);
    const [oldest] = await pool.query(`SELECT MIN(created_at) AS oldest FROM posts
      WHERE author_id = ? AND (visibility = 'public' OR ? = 1)`, [authorId, friendsVisible ? 1 : 0]);
    const hasMore = !!oldest[0]?.oldest && calendarDay(new Date(oldest[0].oldest), timeZone).slice(0, 7) < window.nextBefore;
    res.json({ recaps: summarizeMonths(rows, window.months, timeZone), nextBefore: hasMore ? window.nextBefore : null });
  } catch (error) {
    console.error('monthly recap error:', error);
    res.status(500).json({ error: 'Could not load monthly highlights.' });
  }
}
module.exports = { list };
