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

module.exports = { toggleSubtask };
