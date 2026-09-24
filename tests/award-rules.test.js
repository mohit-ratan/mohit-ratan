const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');

test('star boundaries are unambiguous and increase every fifteen days after day fifteen',async()=>{
 const {awardStars}=await import('../client/src/lib/awardRank.mjs');
 for(const [days,stars] of [[1,1],[7,1],[8,2],[15,2],[16,3],[30,3],[31,4],[45,4],[46,5],[60,5],[61,6]])assert.equal(awardStars(days),stars);
});
test('gold award requires dated completions in all categories within 45 days and grants once',async()=>{
 const now=Date.now(), day=86400000;let events=[],earned=false;
 const sandbox={module:{exports:{}},Date,Set,Map,require:n=>n==='../db'?{query:async(sql,args)=>{
  if(sql.includes('FROM special_awards'))return [earned?[{earned_at:new Date(now)}]:[]];
  if(sql.includes('FROM task_checkins'))return [events];
  if(sql.startsWith('INSERT IGNORE')){assert.equal(args[1],'trifecta-45');const affectedRows=earned?0:1;earned=true;return [{affectedRows}];}
  throw new Error(sql);
 }}:n==='./memberFeatures'?{ensureMemberTables:async()=>{}}:require('../src/lib/goalProgress')};
 vm.runInNewContext(fs.readFileSync('src/lib/trifecta.js','utf8'),sandbox);
 const {windowCategories,checkAndAwardTrifecta}=sandbox.module.exports;
 events=[{category:'health',occurred_ms:now-46*day},{category:'wealth',occurred_ms:now-day},{category:'relationships',occurred_ms:now}];
 assert.equal(await checkAndAwardTrifecta('owner'),false);
 assert.equal(windowCategories([{category:'health',occurred_ms:now-45*day}],now).size,1);
 assert.equal(windowCategories([{category:'health',occurred_ms:now+1}],now).size,0);
 events[0].occurred_ms=now-44*day;
 assert.equal(await checkAndAwardTrifecta('owner'),true);
 assert.equal(await checkAndAwardTrifecta('owner'),false);
});
