const { v4: uuidv4 } = require('uuid');
const pool = require('../db');

// Toggles one subtask's done state. Scoped to the caller's own goal — a
// user can only edit their own checklist, matching the fact that this
// modifies data rather than just viewing someone else's achievements.
async function toggleSubtask(req, res) {
  try {
    const { tag, index } = req.params;
    const [rows] = await pool.query(
      'SELECT id, subtasks FROM goals WHERE author_id = ? AND tag = ?',
      [req.userId, tag]
    );
    if (!rows.length) return res.status(404).json({ error: 'No goal found for that tag.' });

    const subtasks = rows[0].subtasks || [];
    const i = Number(index);
    if (!subtasks[i]) return res.status(400).json({ error: 'Invalid subtask index.' });

    subtasks[i].done = !subtasks[i].done;
    await pool.query('UPDATE goals SET subtasks = ? WHERE id = ?', [JSON.stringify(subtasks), rows[0].id]);

    const completed = subtasks.length > 0 && subtasks.every((t) => t.done);
    res.json({ subtasks, completed });
  } catch (err) {
    console.error('toggle subtask error:', err);
    res.status(500).json({ error: 'Could not update that subtask.' });
  }
}

// Creates or replaces a goal's target date + subtasks wholesale. Doubles as
// "add a goal to a tag that skipped setup at creation" when no row exists
// yet — requires at least one post under the tag so a goal can't be
// created for nothing.
async function upsert(req, res) {
  try {
    const { tag } = req.params;
    const { targetDate } = req.body || {};
    const subtasksRaw = Array.isArray(req.body?.subtasks) ? req.body.subtasks : [];
    const subtasks = subtasksRaw
      .filter((t) => t && typeof t.text === 'string' && t.text.trim())
      .slice(0, 15)
      .map((t) => ({ text: t.text.trim().slice(0, 140), done: !!t.done }));

    const [hasPosts] = await pool.query(
      'SELECT 1 FROM posts WHERE author_id = ? AND tag = ? LIMIT 1',
      [req.userId, tag]
    );
    if (!hasPosts.length) return res.status(400).json({ error: 'No posts exist under that tag yet.' });

    const [existing] = await pool.query('SELECT id FROM goals WHERE author_id = ? AND tag = ?', [req.userId, tag]);
    if (existing.length) {
      await pool.query('UPDATE goals SET target_date = ?, subtasks = ? WHERE id = ?', [
        targetDate || null, JSON.stringify(subtasks), existing[0].id,
      ]);
    } else {
      await pool.query(
        'INSERT INTO goals (id, author_id, tag, target_date, subtasks) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), req.userId, tag, targetDate || null, JSON.stringify(subtasks)]
      );
    }

    const completed = subtasks.length > 0 && subtasks.every((t) => t.done);
    res.json({ targetDate: targetDate || null, subtasks, completed });
  } catch (err) {
    console.error('upsert goal error:', err);
    res.status(500).json({ error: 'Could not save that goal.' });
  }
}

async function remove(req, res) {
  try {
    const { tag } = req.params;
    await pool.query('DELETE FROM goals WHERE author_id = ? AND tag = ?', [req.userId, tag]);
    res.json({ ok: true });
  } catch (err) {
    console.error('delete goal error:', err);
    res.status(500).json({ error: 'Could not delete that goal.' });
  }
}

module.exports = { toggleSubtask, upsert, remove };
