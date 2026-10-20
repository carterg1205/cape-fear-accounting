import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundled=await build({entryPoints:['worker/course-engine.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {compileCourse}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const base='http://127.0.0.1:8787',cookies={};let checks=0;
async function req(who,path,data,status=200){const r=await fetch(base+'/api/'+path,{method:data===undefined?'GET':'POST',headers:{Origin:base,Cookie:cookies[who]||'','Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)}),d=await r.json();assert.equal(r.status,status,path+': '+JSON.stringify(d));checks++;if(r.headers.get('set-cookie'))cookies[who]=r.headers.get('set-cookie').split(';')[0];return d;}
await req('i','login',{demo:'instructor'});await req('s','login',{demo:'student'});
await req('s','classes',undefined,403);await req('s','classes',{name:'Forbidden class'},403);await req('i','classes',{name:'A'},400);
const cls=await req('i','classes',{name:'Evening accounting'},201),scope='section='+cls.id;
assert.equal((await req('i','classes')).classes.some(s=>s.id===cls.id),true);await req('s','state?'+scope,undefined,403);
assert.equal((await req('i','classes/students?'+scope+'&q=Jamie')).students.some(s=>s.id==='local-student'),true);
await req('i','classes/enroll?'+scope,{studentId:'not-a-student'},404);await req('i','classes/enroll?'+scope,{studentId:'local-student'});await req('i','classes/enroll?'+scope,{studentId:'local-student'});
assert.equal((await req('s','state?'+scope)).sections.some(s=>s.id===cls.id),true);await req('s','classes/students?'+scope,undefined,403);
const saved=await req('i','course/save?'+scope,{name:'Statement course',params:{}});assert.equal(saved.activities,43);assert.equal(saved.modelVersion,2);
let state=await req('i','state?'+scope);assert.equal(state.assignments.length,43);assert.equal(state.courseModelVersion,2);assert.equal((await req('i','state')).section.id,'acg201');assert.equal((await req('i','state')).assignments.length,26);
const compiled=compileCourse({},2),assignment=key=>state.assignments.find(a=>a.template_key===key),payload=key=>{const a=compiled.activities.find(a=>a.key===key),s=a.accepted.statement;return {revision:1,reference:a.reference,statement:{company:s.company,title:s.title,basis:s.basis,date:s.date,rows:s.rows.map(r=>({label:r.label,section:r.section,amount:(r.amount/100).toFixed(2)}))}};};
await req('s','units/1/schedule?'+scope,{mode:'open'},403);await req('i','units/1/schedule?'+scope,{mode:'scheduled'},400);await req('i','units/1/schedule?'+scope,{mode:'scheduled',opensAt:'2030-02-01',dueAt:'2030-01-01'},400);
await req('s',`assignments/${assignment('u1is').id}/check?${scope}`,payload('u1is'),403);
await req('i','units/1/schedule?'+scope,{mode:'scheduled',opensAt:'2030-01-01',dueAt:'2030-02-01'});let student=await req('s','state?'+scope);assert.equal(student.assignments.filter(a=>a.unit===1).every(a=>!a.unlocked),true);
await req('i','units/1/schedule?'+scope,{mode:'open',dueAt:'2030-02-01'});student=await req('s','state?'+scope);assert.equal(student.assignments.filter(a=>a.unit===1).every(a=>a.unlocked&&a.due_at==='2030-02-01T00:00:00.000Z'),true);assert.equal(JSON.stringify(student).includes('accepted'),false);
for(const a of compiled.activities.filter(a=>a.activity.kind==='statement'))assert.equal((await req('i',`assignments/${assignment(a.key).id}/check?${scope}&preview=true`,payload(a.key))).correct,true);
assert.equal((await req('i','course?'+scope)).frozen,false);
const a=assignment('u1is'),good=payload('u1is'),wrong=structuredClone(good);wrong.statement.rows[0].amount='3';wrong.statement.rows[0].section='Other revenue';
await req('s',`assignments/${a.id}/draft?${scope}`,wrong);student=await req('s','state?'+scope);assert.ok(student.drafts.some(d=>d.assignment_id===a.id));
let result=await req('s',`assignments/${a.id}/check?${scope}`,wrong);assert.equal(result.correct,false);assert.ok(result.issues.some(i=>i.path==='rows.0.amount'));assert.ok(result.issues.some(i=>i.path==='rows.0.section'));
assert.equal((await req('s',`assignments/${a.id}/check?${scope}`,{...good,reference:'wrong'})).correct,false);await req('s',`assignments/${a.id}/post?${scope}`,{...good,revision:0},409);
assert.equal((await req('s',`assignments/${a.id}/post?${scope}`,good)).correct,true);await req('s',`assignments/${a.id}/post?${scope}`,good,409);
student=await req('s','state?'+scope);assert.equal(student.entries.length,0);assert.ok(student.completedWork.find(c=>c.assignment_id===a.id));assert.ok(student.assignments.find(x=>x.id===a.id).entry_id);assert.equal(student.drafts.some(d=>d.assignment_id===a.id),false);
await req('i','course/save?'+scope,{id:saved.id,revision:1,name:'Frozen',params:{}},409);
await req('i','units/3/schedule?'+scope,{mode:'open'});await req('i','section/settings?'+scope,{reportsUnlocked:true,weight:5,correctionEnabled:true,correctionDelayHours:0});await req('s','reports?'+scope,undefined,403);await req('i','reports?'+scope+'&student=local-student');
// Corrections bridge the new connected entries but never count as statement credit.
await req('i','units/2/schedule?'+scope,{mode:'open',dueAt:new Date(Date.now()-3600000).toISOString()});student=await req('s','state?'+scope);assert.equal(student.correctionCount,5);assert.equal(student.providedCount,0);assert.equal(student.lines.filter(l=>l.account==='1010').reduce((s,l)=>s+l.debit-l.credit,0),-270000);assert.equal(student.assignments.filter(a=>a.unit===2&&a.entry_id).length,0);
await req('i','units/13/schedule?'+scope,{mode:'open'});const report=await req('s','reports?'+scope);assert.equal(report.equationDifference,0);assert.equal(report.company,compiled.params.company);
// One assignment deadline does not alter the rest of its unit, and extensions still apply.
const closed=assignment('u3bs');await req('i',`assignments/${closed.id}/release?${scope}`,{mode:'open',dueAt:new Date(Date.now()-3600000).toISOString()});await req('s',`assignments/${closed.id}/post?${scope}`,payload('u3bs'),403);await req('i',`assignments/${closed.id}/extension?${scope}`,{studentId:'local-student',dueAt:'2030-02-01'});assert.equal((await req('s',`assignments/${closed.id}/post?${scope}`,payload('u3bs'))).correct,true);
// Another class cannot access, enroll, or reschedule this course through guessed IDs.
await req('i',`assignments/${a.id}/release`,{mode:'open'},404);await req('i','units/1/schedule?section=other-test',{mode:'open'},403);await req('i','classes/enroll?section=other-test',{studentId:'local-student'},403);assert.equal((await req('i','classes/students?q=other@example.test')).students.length,0);
console.log('Statements, classes and weekly scheduling HTTP checks passed:',checks);
