const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { canView } = require('../lib/follows');
const { targetDays, normalizeTasks } = require('../lib/goalProgress');

// Goals belong to an author's tag, so every post in that journey shows the same progress.
async function get(req, res) {
  try {
    const authorId = req.query.authorId || req.userId;
    if (!(await canView(req.userId, authorId))) return res.status(404).json({ error: 'Goal not found.' });
    const [rows] = await pool.query(
      'SELECT target_date, subtasks FROM goals WHERE author_id = ? AND tag = ?',
      [authorId, req.params.tag]
    );
    if (!rows.length) return res.json({ goal: null });
    const subtasks = normalizeTasks(rows[0].subtasks);
    const date = rows[0].target_date;
    // DATE columns represent calendar dates, independent of UTC offsets.
    const targetDate = date instanceof Date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      : date ? String(date).slice(0, 10) : null;
    res.json({ goal: { targetDate, subtasks, completed: subtasks.length > 0 && subtasks.every((task) => task.done) } });
  } catch (err) {
    console.error('get goal error:', err);
    res.status(500).json({ error: 'Could not load this goal.' });
  }
}

// Legacy checkbox endpoint cannot bypass photo-based progress.
async function toggleSubtask(req, res) {
  return res.status(400).json({ error: 'Upload a photo for this task to record another day of progress.' });
}

// Creates or replaces a goal's target date + subtasks wholesale. Doubles as
// "add a goal to a tag that skipped setup at creation" when no row exists
// yet — requires at least one post under the tag so a goal can't be
// created for nothing.
async function upsert(req, res) {
  let connection;
  try {
    const { tag } = req.params;
    const { targetDate } = req.body || {};
    const subtasksRaw = Array.isArray(req.body?.subtasks) ? req.body.subtasks : [];
    const [hasPosts] = await pool.query(
      'SELECT 1 FROM posts WHERE author_id = ? AND tag = ? LIMIT 1',
      [req.userId, tag]
    );
    if (!hasPosts.length) return res.status(400).json({ error: 'No posts exist under that tag yet.' });

    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [existing] = await connection.query('SELECT id, subtasks FROM goals WHERE author_id = ? AND tag = ? FOR UPDATE', [req.userId, tag]);
    const saved = normalizeTasks(existing[0]?.subtasks);
    const used = new Set();
    const subtasks = subtasksRaw
      .filter((t) => t && typeof t.text === 'string' && t.text.trim())
      .slice(0, 15)
      .map((t) => {
        const previous = saved.find((task) => task.id === t.id && !used.has(task.id));
        if (previous) used.add(previous.id);
        const days = targetDays(t.targetDays);
        const completedDays = Math.min(days, previous?.completedDays || 0);
        return { id: previous?.id || uuidv4(), text: t.text.trim().slice(0, 140), targetDays: days, completedDays, done: completedDays >= days };
      });
    if (existing.length) {
      await connection.query('UPDATE goals SET target_date = ?, subtasks = ? WHERE id = ?', [
        targetDate || null, JSON.stringify(subtasks), existing[0].id,
      ]);
    } else {
      await connection.query(
        'INSERT INTO goals (id, author_id, tag, target_date, subtasks) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), req.userId, tag, targetDate || null, JSON.stringify(subtasks)]
      );
    }

    await connection.commit();
    const completed = subtasks.length > 0 && subtasks.every((t) => t.done);
    res.json({ targetDate: targetDate || null, subtasks, completed });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('upsert goal error:', err);
    res.status(500).json({ error: 'Could not save that goal.' });
  } finally {
    connection?.release();
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

module.exports = { get, toggleSubtask, upsert, remove };
