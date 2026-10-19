import type {Context} from './classroom';
import {compileCourse} from './course-engine';
import {referenceFeedback} from './accounting';
export async function preparedCourse(c:Context):Promise<Response|null>{
 const {req,url,sql,env,user,instructor,sectionId,body,fail,json}=c,path=url.pathname;
 const staff=()=>{if(!instructor)fail('Instructor access required.',403);};
 if(path==='/api/course'&&req.method==='GET'){
  staff();const versions=(await sql('SELECT * FROM course_versions WHERE section_id=? ORDER BY created_at DESC,id',sectionId).all()).results;
  const selected=versions.find(v=>v.id===url.searchParams.get('version'))||versions.find(v=>v.id===c.section.course_version)||versions[0];
  const frozen=selected?!!await sql('SELECT t.id FROM attempts t JOIN assignments a ON a.id=t.assignment_id WHERE a.course_version=? LIMIT 1',selected.id).first():false;
  return json({versions:versions.map(v=>({id:v.id,name:v.name,revision:v.revision,status:v.status})),version:selected||null,frozen,preview:compileCourse(selected?JSON.parse(String(selected.params)):{}).activities.map(a=>({key:a.key,unit:a.unit,title:a.title,activity:a.activity}))});
 }
 if(path==='/api/course/save'&&req.method==='POST'){
  staff();const data=await body(req);let compiled;try{compiled=compileCourse(data.params);}catch(e:any){fail(e.message);}
  const existing=data.id?await sql('SELECT * FROM course_versions WHERE id=? AND section_id=?',data.id,sectionId).first<any>():null;
  if(data.id&&!existing)fail('Course edition not found.',404);
  if(existing&&data.revision!==existing.revision)fail('The course changed. Refresh before saving.',409);
  if(existing&&await sql('SELECT t.id FROM attempts t JOIN assignments a ON a.id=t.assignment_id WHERE a.course_version=? LIMIT 1',existing.id).first())fail('Students have started this edition. Create a new edition to preserve their work.',409);
  const id=existing?.id||crypto.randomUUID(),revision=(existing?.revision||0)+1,name=typeof data.name==='string'?data.name.trim().slice(0,80):'Prepared accounting course';if(!name)fail('Give the course edition a name.');
  const statements:D1PreparedStatement[]=[];
  if(existing)statements.push(sql('INSERT INTO course_edit_guards VALUES(?,?)',id,existing.revision),sql('UPDATE course_versions SET params=?,revision=?,name=? WHERE id=?',JSON.stringify(compiled!.params),revision,name,id));
  else statements.push(sql("INSERT INTO course_versions(id,section_id,name,params,status) VALUES(?,?,?,?,'active')",id,sectionId,name,JSON.stringify(compiled!.params)));
  statements.push(sql("UPDATE course_versions SET status='archived' WHERE section_id=? AND id<>?",sectionId,id),sql("UPDATE course_versions SET status='active' WHERE id=?",id),sql('UPDATE sections SET course_version=? WHERE id=?',id,sectionId));
  for(const a of compiled!.activities){
   const aid=id+'-'+a.key,document=JSON.stringify({kind:'Business record',sender:a.unit===6?'Coastal Community Bank':[2,4,8].includes(a.unit)?compiled!.params.vendor:compiled!.params.company,address:'Wilmington, NC',recipient:compiled!.params.company,reference:a.reference,date:a.date,detail:a.detail,total:a.total/100,note:'Selected simulation records. Each unit begins with the approved prior-unit records; your earlier work remains in submission history.'});
   statements.push(sql("INSERT INTO assignments(id,section_id,unit,title,instructions,document,transaction_date,explanation,points,period_start,period_end,expected_reference,cash_flow,sort_order,published,release_mode,course_version,template_key,course_revision,activity_type,activity_data) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,'locked',?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,instructions=excluded.instructions,document=excluded.document,transaction_date=excluded.transaction_date,explanation=excluded.explanation,points=excluded.points,period_start=excluded.period_start,period_end=excluded.period_end,expected_reference=excluded.expected_reference,cash_flow=excluded.cash_flow,course_revision=excluded.course_revision,activity_data=excluded.activity_data",aid,sectionId,a.unit,a.title,a.intro,document,a.date,'Correct. Your work follows the source record and the lesson principles.',compiled!.params.points,a.date.slice(0,7)+'-01',a.date.slice(0,7)+'-28',a.reference,a.flow,a.key.endsWith('b')?2:1,id,a.key,revision,a.activity.kind,JSON.stringify(a.activity)),sql('INSERT INTO answer_keys VALUES(?,?) ON CONFLICT(assignment_id) DO UPDATE SET accepted=excluded.accepted',aid,JSON.stringify(a.accepted)));
  }
  for(const snapshot of compiled!.snapshots)statements.push(sql('INSERT INTO course_snapshots VALUES(?,?,?) ON CONFLICT(version_id,unit) DO UPDATE SET records=excluded.records',id,snapshot.unit,JSON.stringify(snapshot.records)));
  if(existing)statements.push(sql('DELETE FROM course_edit_guards WHERE version_id=?',id));
  statements.push(sql('INSERT INTO audit(id,actor,action,target,details) VALUES(?,?,?,?,?)',crypto.randomUUID(),user.id,'course.save',id,JSON.stringify({revision,activities:26})));
  try{await env.DB.batch(statements);}catch(e){if(/frozen|conflict/i.test(String(e)))fail('Course content changed or student work started. Refresh and create a new edition.',409);throw e;}
  return json({id,revision,activities:26});
 }
 const match=path.match(/^\/api\/assignments\/([a-zA-Z0-9-]+)\/(draft|check|post)$/);
 if(match&&req.method==='POST'){
  const a=await sql('SELECT * FROM assignments WHERE id=? AND section_id=?',match[1],sectionId).first<any>();if(!a?.course_version||a.activity_type==='journal')return null;
  const action=match[2],preview=instructor&&action==='check'&&url.searchParams.get('preview')==='true';
  if(!preview&&user.role!=='student')fail('Only students may submit activities.',403);
  if(!preview&&a.course_version!==c.section.course_version)fail('This edition is archived and read-only.',403);
  if(!preview&&!(a.published===1&&(a.release_mode==='open'||a.release_mode==='scheduled'&&Date.parse(a.opens_at)<=Date.now())))fail('This activity is locked.',403);
  const extension=await sql('SELECT due_at FROM extensions WHERE user_id=? AND assignment_id=?',user.id,a.id).first<any>();if(!preview&&(extension?.due_at||a.due_at)&&Date.parse(extension?.due_at||a.due_at)<Date.now())fail('The assignment deadline has passed.',403);
  if(!preview&&await sql('SELECT id FROM student_submissions WHERE user_id=? AND assignment_id=?',user.id,a.id).first())fail('Already completed.',409);
  const data=await body(req);if(data.revision!==a.course_revision)fail('The course changed. Refresh the activity.',409);
  if(action==='draft'){await sql('INSERT INTO drafts VALUES(?,?,?) ON CONFLICT(user_id,assignment_id) DO UPDATE SET body=excluded.body',user.id,a.id,JSON.stringify(data)).run();return json({ok:true});}
  const key=JSON.parse((await sql('SELECT accepted FROM answer_keys WHERE assignment_id=?',a.id).first<any>())!.accepted),activity=JSON.parse(a.activity_data);
  let feedback=referenceFeedback(data.reference,a.expected_reference);
  if(!feedback){for(const field of activity.fields){const raw=data.answers?.[field.id],expected=key.fields[field.id];let actual:any=raw;if(field.kind!=='choice'){if(typeof raw!=='string'||!/^[-]?\d+(\.\d{1,2})?$/.test(raw)){feedback='Enter a number for '+field.label+'.';break;}actual=field.kind==='integer'?Number(raw):Math.round(Number(raw)*100);}if(actual!==expected){feedback='Review '+field.label+' using the business record and worked example.';break;}}}
  if(preview)return json({correct:!feedback,feedback:feedback||'Correct. Preview does not change student records.'});
  const attempt=sql('INSERT INTO attempts(id,user_id,assignment_id,body,feedback,correct,course_revision) VALUES(?,?,?,?,?,?,?)',crypto.randomUUID(),user.id,a.id,JSON.stringify(data),feedback||'Activity is correct.',feedback?0:1,a.course_revision);
  try{await env.DB.batch([attempt,...(!feedback&&action==='post'?[sql('INSERT INTO completions(id,user_id,assignment_id,answers,course_revision) VALUES(?,?,?,?,?)',crypto.randomUUID(),user.id,a.id,JSON.stringify(data.answers),a.course_revision),sql('DELETE FROM drafts WHERE user_id=? AND assignment_id=?',user.id,a.id)]:[])]);}catch(e){if(/UNIQUE|changed/i.test(String(e)))fail('The activity changed or has already been submitted. Refresh.',409);throw e;}
  return json({correct:!feedback,feedback:feedback|| (action==='post'?'Activity completed. Your work has been saved.':'Correct. Ready to submit.')});
 }
 return null;
}
export async function courseLedger(c:Context,studentId:string){
 const version=c.url.searchParams.get('version')||c.section.course_version||null;
 if(version==='legacy'||!version)return null;
 const v=await c.sql('SELECT * FROM course_versions WHERE id=? AND section_id=?',version,c.sectionId).first<any>();if(!v)c.fail('Course edition not found.',404);
 const released=(await c.sql("SELECT unit FROM assignments WHERE course_version=? AND published=1 AND (release_mode='open' OR (release_mode='scheduled' AND opens_at<=?)) ORDER BY unit DESC LIMIT 1",version,new Date().toISOString()).first<any>())?.unit||1;
 const unit=Number(c.url.searchParams.get('unit')||released);if(!Number.isInteger(unit)||unit<1||unit>13)c.fail('Invalid unit.');
 if(!c.instructor&&unit>released)c.fail('This unit has not been released.',403);
 const snapshot=await c.sql('SELECT records FROM course_snapshots WHERE version_id=? AND unit=?',version,unit).first<any>();
 const records=JSON.parse(snapshot?.records||'[]');const provided=records.flatMap((r:any)=>r.lines.map((l:any)=>({...l,date:r.date,memo:'Provided starting record · '+r.memo,reference:r.reference,cash_flow:r.cash_flow,provided:true})));
 const entries=(await c.sql('SELECT e.* FROM entries e JOIN assignments a ON a.id=e.assignment_id WHERE e.user_id=? AND a.course_version=? AND a.unit=? ORDER BY e.date,e.created_at',studentId,version,unit).all()).results;
 const lines=(await c.sql('SELECT l.*,e.date,e.memo,e.reference,a.cash_flow FROM lines l JOIN entries e ON e.id=l.entry_id JOIN assignments a ON a.id=e.assignment_id WHERE e.user_id=? AND a.course_version=? AND a.unit=? ORDER BY e.date,e.created_at,l.id',studentId,version,unit).all()).results;
 return {version,unit,entries,lines:[...provided,...lines],providedCount:records.length};
}
