const pool = require('../db');
const { ensureMemberTables } = require('../lib/memberFeatures');
const { summarize } = require('../lib/memberSummary');
const { validTimeZone } = require('../lib/taskCelebration');
async function dashboard(req,res) {
  try {
    await ensureMemberTables();
    const [prefs]=await pool.query('SELECT * FROM member_preferences WHERE user_id=?',[req.userId]);
    const zone=prefs[0]?.time_zone || validTimeZone(req.query.timeZone);
    const [goals]=await pool.query(`SELECT g.tag, DATE_FORMAT(g.target_date,'%Y-%m-%d') target_date, g.subtasks,
      (SELECT p.category FROM posts p WHERE p.author_id=g.author_id AND p.tag=g.tag GROUP BY p.category ORDER BY COUNT(*) DESC,p.category LIMIT 1) category
      FROM goals g WHERE g.author_id=?`,[req.userId]);
    const [events]=await pool.query('SELECT * FROM task_checkins WHERE user_id=? AND occurred_ms>=?',[req.userId,Date.now()-9*86400000]);
    const [consistency]=await pool.query('SELECT * FROM category_consistency WHERE user_id=?',[req.userId]);
    const [special]=await pool.query("SELECT earned_at FROM special_awards WHERE user_id=? AND award_id='trifecta'",[req.userId]);
    res.json({...summarize(goals,events,consistency,zone),trifectaEarned:!!special.length,preferences:{timeZone:zone,enabled:!!prefs[0]?.reminder_enabled,time:prefs[0]?.reminder_time||'19:00'}});
  } catch(err){console.error('Dashboard failed:',err.code);res.status(500).json({error:'Could not load your daily progress.'});}
}
async function preferences(req,res) {
  const {timeZone,time,enabled}=req.body||{};
  if(typeof timeZone!=='string'||validTimeZone(timeZone)!==timeZone||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time||'')||typeof enabled!=='boolean') return res.status(400).json({error:'Choose a valid timezone, time, and reminder preference.'});
  try { await ensureMemberTables();await pool.query('INSERT INTO member_preferences (user_id,time_zone,reminder_time,reminder_enabled) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE time_zone=VALUES(time_zone),reminder_time=VALUES(reminder_time),reminder_enabled=VALUES(reminder_enabled)',[req.userId,timeZone,time,enabled?1:0]);res.json({ok:true}); }
  catch(err){res.status(500).json({error:'Could not save reminder preferences.'});}
}
module.exports={dashboard,preferences};
