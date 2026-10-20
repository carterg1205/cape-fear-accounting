import assert from 'node:assert/strict';
const base='http://127.0.0.1:8787',cookies={};let checks=0;
async function req(who,path,data,status=200){const r=await fetch(base+'/api/'+path,{method:data===undefined?'GET':'POST',headers:{Origin:base,Cookie:cookies[who]||'','Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});const d=await r.json();assert.equal(r.status,status,JSON.stringify(d));checks++;if(r.headers.get('set-cookie'))cookies[who]=r.headers.get('set-cookie').split(';')[0];return d;}
await req('i','login',{demo:'instructor'});await req('s','login',{demo:'student'});
await req('i','course/save',{modelVersion:1,params:{},name:'Scheduled correction test'});const state=await req('i','state'),assign=key=>state.assignments.find(a=>a.template_key===key),now=Date.now(),ago=h=>new Date(now-h*3600000).toISOString(),later=h=>new Date(now+h*3600000).toISOString();
const settings=(correctionEnabled,correctionDelayHours)=>({reportsUnlocked:true,weight:5,correctionEnabled,correctionDelayHours});
await req('s','section/settings',settings(true,24),403);await req('i','section/settings',settings(true,-1),400);await req('i','section/settings',settings(true,169),400);await req('i','section/settings',settings(true,1.5),400);
await req('i','section/settings',settings(true,24));
for(const key of ['u1a','u1b'])await req('i',`assignments/${assign(key).id}/release`,{mode:'open',dueAt:ago(1)});
let s=await req('s','state');assert.equal(s.correctionCount,0);assert.equal(s.trial.find(a=>a.id==='1010').balance,0);assert.ok(s.assignments.find(a=>a.template_key==='u1a').correction_at>new Date().toISOString());
// Closing a previously released week does not remove its history or cancel due corrections.
await req('i',`assignments/${assign('u1a').id}/release`,{mode:'locked'});
// Correction is disabled independently of deadlines.
await req('i','section/settings',settings(false,0));s=await req('s','state');assert.equal(s.correctionCount,0);
// An individual extension postpones only that student's pending correction.
await req('i',`assignments/${assign('u1b').id}/extension`,{studentId:'local-student',dueAt:later(48)});
await req('i','section/settings',settings(true,0));
s=await req('s','state');assert.equal(s.correctionCount,1);assert.equal(s.trial.find(a=>a.id==='1010').balance,2000000);assert.equal(s.assignments.filter(a=>a.entry_id).length,0);assert.equal(s.entries.length,0);
assert.ok(s.lines.every(l=>l.system));assert.ok(s.corrections.every(c=>c.memo.startsWith('Automatic book correction')));
// Reads are idempotent, including concurrent state and statement requests.
const results=await Promise.all([req('s','state'),req('s','state'),req('s','reports')]);assert.equal(results[0].correctionCount,1);assert.equal(results[1].correctionCount,1);assert.equal(results[2].cash,2000000);assert.equal(results[2].equationDifference,0);
await req('i',`assignments/${assign('u1b').id}/extension`,{studentId:'local-student',dueAt:null});s=await req('s','state');assert.equal(s.correctionCount,2);assert.equal(s.trial.find(a=>a.id==='1010').balance,2110000);
// A correct student post remains manual and is never counted again as a correction.
for(const key of ['u2a','u2b'])await req('i',`assignments/${assign(key).id}/release`,{mode:'open'});
const a=assign('u2a'),payload={date:a.transaction_date,reference:'CFO-U02-A',revision:1,memo:'Equipment paid in cash',lines:[{account:'1500',debit:240000,credit:0},{account:'1010',debit:0,credit:240000}]};
assert.equal((await req('s',`assignments/${a.id}/post`,payload)).correct,true);
for(const key of ['u2a','u2b'])await req('i',`assignments/${assign(key).id}/release`,{mode:'open',dueAt:ago(1)});
s=await req('s','state');assert.equal(s.correctionCount,3);assert.equal(s.entries.length,1);assert.equal(s.assignments.filter(a=>a.entry_id).length,1);assert.equal(s.trial.find(a=>a.id==='1010').balance,1750000);assert.equal(s.corrections.some(c=>c.assignment_id===a.id),false);
// Provided transactions survive closing a prior unit, as do the default ledger period and balances.
await req('i',`assignments/${assign('u3a').id}/release`,{mode:'open'});await req('i',`assignments/${assign('u3a').id}/release`,{mode:'locked'});const closed=await req('s','state');assert.equal(closed.unit,3);assert.equal(closed.providedCount,1);assert.equal(closed.trial.find(a=>a.id==='1010').balance,1840000);
// A later extension lets a student earn credit after correction; the same transaction is not duplicated.
await req('i',`assignments/${assign('u2b').id}/extension`,{studentId:'local-student',dueAt:later(48)});
const b=assign('u2b');assert.equal((await req('s',`assignments/${b.id}/post`,{date:b.transaction_date,reference:'CFO-U02-B',revision:1,memo:'Purchased insurance policy',lines:[{account:'1300',debit:120000,credit:0},{account:'1010',debit:0,credit:120000}]})).correct,true);
s=await req('s','state');assert.equal(s.correctionCount,2);assert.equal(s.entries.length,2);assert.equal(s.trial.find(a=>a.id==='1010').balance,1840000);
// Opening a later week does not expose answers for assignments without deadlines or locked assignments.
await req('i',`assignments/${assign('u4a').id}/release`,{mode:'open'});
s=await req('s','state');assert.equal(s.correctionCount,2);assert.equal(s.lines.some(l=>l.account==='1200'),false);assert.equal(s.lines.some(l=>l.account==='1300'&&l.credit),false);assert.ok(s.lines.some(l=>l.memo==='Provided business record · Advance tour booking deposit'));
const report=await req('s','reports');assert.equal(report.equationDifference,0);assert.equal(report.cash,1840000);
// Frozen correction content is not replaced, and correction records never appear as graded submissions.
await req('i','course/save',{modelVersion:1,id:state.viewVersion,revision:1,params:{capital:3000000},name:'Cannot replace history'},409);
const admin=await req('i','instructor');assert.equal(admin.submissions.filter(x=>x.user_id==='local-student'&&state.assignments.some(a=>a.id===x.assignment_id)).length,2);
// Scheduled maintenance applies corrections even when no student opens the app.
await req('i','course/save',{modelVersion:1,params:{},name:'Background correction test'});const background=await req('i','state'),target=background.assignments.find(a=>a.template_key==='u2a');
await req('i',`assignments/${target.id}/release`,{mode:'open',dueAt:ago(1)});
const scheduled=await fetch(base+'/__scheduled?cron='+encodeURIComponent('*/15 * * * *'));assert.equal(scheduled.status,200);await scheduled.text();checks++;
await req('i','section/settings',settings(false,0));const fixed=await req('s','state');assert.equal(fixed.correctionCount,1);assert.equal(fixed.trial.find(a=>a.id==='1500').balance,240000);
await req('i','course/save',{modelVersion:1,id:background.viewVersion,revision:1,params:{equipment:300000},name:'Frozen by correction'},409);
console.log('Book-correction HTTP checks passed:',checks);
