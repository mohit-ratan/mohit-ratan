const pool = require('../db');
const { sendMail } = require('../utils/mailer');
const { ensureMemberTables } = require('./memberFeatures');
const { calendarDay } = require('./taskCelebration');
const { normalizeTasks } = require('./goalProgress');
function reminderDue(timeZone, time, now=new Date()) {
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const minute=Number(parts.find(p=>p.type==='hour').value)*60+Number(parts.find(p=>p.type==='minute').value);
  const [h,m]=time.split(':').map(Number);
  return minute>=h*60+m && minute<h*60+m+30;
}
async function sendPersonalReminders(now=new Date()) {
  await ensureMemberTables();
  const [members]=await pool.query('SELECT p.*,u.email FROM member_preferences p JOIN users u ON u.id=p.user_id WHERE p.reminder_enabled=1 AND u.email_verified=1');
  let sent=0;
  for(const member of members) {
    try {
      if(!reminderDue(member.time_zone,member.reminder_time,now)) continue;
      const day=calendarDay(now,member.time_zone);
      const [goals]=await pool.query('SELECT subtasks FROM goals WHERE author_id=?',[member.user_id]);
      const pending=goals.flatMap(g=>normalizeTasks(g.subtasks)).some(t=>!t.done&&t.lastProgressDate!==calendarDay(now,t.streakTimeZone||member.time_zone));
      if(!pending) continue;
      // Unique daily claim prevents repeated mail from concurrent workers or DST repeats.
      // Uncertain/failed sends are not retried automatically (avoid duplicate emails).
      const [claim]=await pool.query("INSERT IGNORE INTO reminder_deliveries (user_id,day_key,status) VALUES (?,?,'claimed')",[member.user_id,day]);
      if(!claim.affectedRows) continue;
      const [current]=await pool.query('SELECT reminder_enabled FROM member_preferences WHERE user_id=?',[member.user_id]);
      if(!current[0]?.reminder_enabled) { await pool.query("UPDATE reminder_deliveries SET status='cancelled' WHERE user_id=? AND day_key=?",[member.user_id,day]);continue; }
      try {
        const url=(process.env.APP_URL||'http://localhost:4000').replace(/\/$/,'');
        await sendMail({to:member.email,subject:'A little progress is waiting for you',html:`<p>You have a goal task ready for a photo check-in today.</p><p><a href="${url}/today">Open your Today dashboard</a></p><p>Change the time or turn off reminders in <a href="${url}/today#reminders">reminder settings</a>.</p>`});
        await pool.query("UPDATE reminder_deliveries SET status='sent' WHERE user_id=? AND day_key=?",[member.user_id,day]);sent++;
      } catch(err) {await pool.query("UPDATE reminder_deliveries SET status='failed' WHERE user_id=? AND day_key=?",[member.user_id,day]);console.error('Personal reminder failed:',err.code||err.name);}
    }catch(err){console.error('Reminder processing failed:',err.code||err.name);}
  }
  return sent;
}
module.exports={reminderDue,sendPersonalReminders};
