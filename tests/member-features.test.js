const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {summarize,longestStreak}=require('../src/lib/memberSummary');
test('recap uses local dates, excludes old events and counts distinct completed goals',()=>{
 const now=new Date('2026-09-23T20:00:00Z');
 const result=summarize([{tag:'walk',category:'health',target_date:'2026-09-23',subtasks:[{id:'t',text:'Walk',targetDays:10,completedDays:3,lastProgressDate:'2026-09-24',streakTimeZone:'Asia/Kolkata'}]}],
 [0,1].map(()=>({occurred_ms:now.getTime(),goal_completed:1,goal_tag:'walk',category:'health'})).concat({occurred_ms:0}),[], 'Asia/Kolkata',now);
 assert.equal(result.today,'2026-09-24');assert.equal(result.tasks[0].daysLeft,-1);assert.equal(result.tasks[0].checkedInToday,true);
 assert.equal(result.recap.checkIns,2);assert.equal(result.recap.goalsCompleted,1);assert.equal(result.awards[0].goalPercent,30);
 assert.equal(longestStreak(['2026-09-21','2026-09-21','2026-09-22','2026-09-24']),2);
});
test('journal encryption rejects tampering and another owner/context',()=>{
 const sandbox={module:{exports:{}},Buffer,process:{env:{JOURNAL_ENCRYPTION_KEY:'ab'.repeat(32)}},require:n=>n==='./mediaPath'?require('../src/lib/mediaPath'):n==='sharp'?()=>{}:n==='@aws-sdk/client-s3'?{}:require(n)};
 vm.runInNewContext(fs.readFileSync('src/lib/journalStorage.js','utf8'),sandbox);
 const storage=sandbox.module.exports, encrypted=storage.encrypt(Buffer.from('private thought'),'owner:entry:note');
 assert.equal(storage.decrypt(encrypted,'owner:entry:note').toString(),'private thought');
 assert.throws(()=>storage.decrypt(encrypted,'stranger:entry:note'));
 encrypted[encrypted.length-1]^=1;assert.throws(()=>storage.decrypt(encrypted,'owner:entry:note'));
 assert.equal(storage.mediaReady(),false);
});
test('reminders respect timezone, daily claims and a last-minute opt-out',async()=>{
 let sent=0,claimed=false,enabled=true;
 const sandbox={module:{exports:{}},process:{env:{}},console,require:n=>n==='../db'?{query:async sql=>{
  if(sql.includes('JOIN users'))return [[{user_id:'u',email:'test@example.test',time_zone:'Asia/Kolkata',reminder_time:'19:00'}]];
  if(sql.includes('FROM goals'))return [[{subtasks:[{text:'Walk',targetDays:7,completedDays:0}]}]];
  if(sql.startsWith('INSERT IGNORE')){const affectedRows=claimed?0:1;claimed=true;return [{affectedRows}];}
  if(sql.startsWith('SELECT reminder_enabled'))return [[{reminder_enabled:enabled}]];
  return [{}];
 }}:n==='../utils/mailer'?{sendMail:async()=>{sent++;}}:n==='./memberFeatures'?{ensureMemberTables:async()=>{}}:require('../src/lib/'+n.slice(2))};
 vm.runInNewContext(fs.readFileSync('src/lib/personalReminders.js','utf8'),sandbox);
 const {reminderDue,sendPersonalReminders}=sandbox.module.exports;
 const now=new Date('2026-09-23T13:35:00Z');assert.equal(reminderDue('Asia/Kolkata','19:00',now),true);assert.equal(reminderDue('UTC','19:00',now),false);
 await sendPersonalReminders(now);await sendPersonalReminders(now);assert.equal(sent,1);
 claimed=false;enabled=false;await sendPersonalReminders(now);assert.equal(sent,1);
});

test('task award reveals retain exact duration and completed awards',()=>{
 const result=summarize([{tag:'fitness',category:'health',subtasks:[
  {id:'week',text:'Walk',targetDays:7,completedDays:1},
  {id:'month',text:'Train',targetDays:30,completedDays:30}
 ]}],[],[],'UTC');
 assert.deepEqual(result.awards[0].taskAwards.map(t=>[t.id,t.targetDays,t.completedDays]),[['fitness:week',7,1],['fitness:month',30,30]]);
 assert.equal(result.tasks.length,1);
 assert.deepEqual(result.awards[1].taskAwards,[]);
});
