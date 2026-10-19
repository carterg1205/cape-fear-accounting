import {courseLedger} from './prepared-course';
import {validate,financialStatements,type Account,type Line} from './accounting';
export type Context={req:Request;url:URL;env:{DB:D1Database;DOCUMENTS:R2Bucket};user:{id:string;role:string};sectionId:string;section:any;sections:any[];instructor:boolean;accounts:Account[];sql:(s:string,...args:any[])=>D1PreparedStatement;body:(r:Request)=>Promise<any>;fail:(m:string,s?:number)=>never;json:(d:unknown,s?:number)=>Response};
const available=(a:any)=>a.published===1&&(a.release_mode==='open'||(a.release_mode==='scheduled'&&a.opens_at&&Date.parse(a.opens_at)<=Date.now()));
export async function classroom(c:Context):Promise<Response|null>{
 const {req,url,env,user,sectionId,section,sections,instructor,accounts,sql,body,fail,json}=c,path=url.pathname;
 const staff=()=>{if(!instructor)fail('Instructor access required.',403);};
 const audit=(action:string,target:string,data:unknown)=>sql('INSERT INTO audit(id,actor,action,target,details) VALUES(?,?,?,?,?)',crypto.randomUUID(),user.id,action,target,JSON.stringify(data));
 const assignment=async(id:string)=>{const a=await sql('SELECT * FROM assignments WHERE id=? AND section_id=?',id,sectionId).first<any>();if(!a)fail('Assignment not found.',404);return a;};
 const editable=async(id:string)=>{if(await sql('SELECT id FROM attempts WHERE assignment_id=? LIMIT 1',id).first())fail('Student work has started. Copy this assignment to change its source document or answer key.',409);};
 const iso=(value:any,label:string)=>{if(value===null||value==='')return null;if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))fail('Choose a valid '+label+'.');return new Date(value).toISOString();};
 const date=(s:any)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
 if(path==='/api/section/settings'&&req.method==='POST'){
  staff();const d=await body(req);if(typeof d.reportsUnlocked!=='boolean'||!Number.isInteger(d.weight)||d.weight<0||d.weight>100)fail('Choose report access and a course weight from 0 to 100.');
  await env.DB.batch([sql('UPDATE sections SET reports_unlocked=?,weight=? WHERE id=?',d.reportsUnlocked?1:0,d.weight,sectionId),audit('section.settings',sectionId,d)]);return json({ok:true});
 }
 if(path==='/api/assignments/save'&&req.method==='POST'){
  staff();const d=await body(req),id=d.id||crypto.randomUUID();
  if(typeof id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(id))fail('Invalid assignment identifier.');
  if(d.id){const existing=await assignment(id);if(existing.course_version)fail('Use the prepared course settings to update all related keys together.',409);await editable(id);}
  if(typeof d.title!=='string'||!d.title.trim()||d.title.length>150||typeof d.instructions!=='string'||d.instructions.length>5000)fail('Enter a title (150 characters maximum) and instructions.');
  if(!Number.isInteger(d.unit)||d.unit<1||d.unit>13||!Number.isInteger(d.points)||d.points<1||d.points>1000||!Number.isInteger(d.order)||d.order<0||d.order>10000)fail('Check the unit, points and display order.');
  if(typeof d.published!=='boolean'||!['none','operating','investing','financing'].includes(d.cashFlow))fail('Check the publishing and cash flow settings.');
  if(!date(d.date)||!date(d.periodStart)||!date(d.periodEnd)||d.periodStart>d.date||d.date>d.periodEnd)fail('The transaction date must fall within its accounting period.');
  if(typeof d.reference!=='string'||!d.reference.trim()||d.reference.length>80)fail('Enter the exact source-document reference (80 characters maximum).');
  if(typeof d.explanation!=='string'||d.explanation.length>3000)fail('The explanation must be at most 3,000 characters.');
  const doc=d.document;if(!doc||typeof doc!=='object'||Array.isArray(doc))fail('Provide the source document details.');
  for(const field of ['sender','detail','kind','note'])if(typeof doc[field]!=='string'||doc[field].length>3000)fail('Check the source document details.');
  if(!Number.isSafeInteger(doc.totalCents)||doc.totalCents<0||doc.totalCents>1e11)fail('Enter a valid document total in cents.');
  if(!Array.isArray(d.accepted)||d.accepted.length<1||d.accepted.length>5)fail('Provide one to five accepted answer configurations.');
  for(const answer of d.accepted){if(!Array.isArray(answer)||answer.length>30)fail('Invalid answer key.');if(d.published){const error=validate(answer,accounts);if(error)fail('Answer key: '+error);const cash=answer.filter((l:Line)=>l.account==='1010').reduce((s:number,l:Line)=>s+l.debit-l.credit,0);if((cash===0)!==(d.cashFlow==='none'))fail('Select a cash flow category when the answer changes Cash; select No cash movement otherwise.');}}
  const opensAt=iso(d.opensAt,'opening date'),dueAt=iso(d.dueAt,'due date');if(opensAt&&dueAt&&opensAt>dueAt)fail('The due date must follow the opening date.');
  const document=JSON.stringify({kind:doc.kind,sender:doc.sender,detail:doc.detail,note:doc.note,total:doc.totalCents/100,date:d.date,reference:d.reference.trim(),address:'Wilmington, NC',recipient:'Cape Fear Outfitters, Inc.'});
  const args=[d.title.trim(),d.instructions,d.unit,d.points,document,d.date,d.explanation,d.periodStart,d.periodEnd,d.reference.trim(),d.cashFlow,d.order,d.published?1:0,opensAt,dueAt];
  const save=d.id?sql('UPDATE assignments SET title=?,instructions=?,unit=?,points=?,document=?,transaction_date=?,explanation=?,period_start=?,period_end=?,expected_reference=?,cash_flow=?,sort_order=?,published=?,opens_at=?,due_at=? WHERE id=?',...args,id):sql("INSERT INTO assignments(title,instructions,unit,points,document,transaction_date,explanation,period_start,period_end,expected_reference,cash_flow,sort_order,published,opens_at,due_at,id,section_id,release_mode) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'locked')",...args,id,sectionId);
  await env.DB.batch([save,sql('INSERT INTO answer_keys VALUES(?,?) ON CONFLICT(assignment_id) DO UPDATE SET accepted=excluded.accepted',id,JSON.stringify(d.accepted)),audit('assignment.save',id,{published:d.published})]);return json({id},d.id?200:201);
 }
 const edit=path.match(/^\/api\/assignments\/([a-zA-Z0-9-]+)\/(edit|copy|upload|extension|remove-document)$/);
 if(edit){
  staff();const [,id,action]=edit,a=await assignment(id);if(a.course_version&&action!=='extension')fail('Use the prepared course settings for this activity.',409);
  if(action==='edit'&&req.method==='GET'){
   const key=await sql('SELECT accepted FROM answer_keys WHERE assignment_id=?',id).first<any>();const documents=(await sql('SELECT id,filename,content_type,size FROM documents WHERE assignment_id=?',id).all()).results;
   const frozen=!!await sql('SELECT id FROM attempts WHERE assignment_id=? LIMIT 1',id).first();return json({assignment:a,accepted:JSON.parse(key?.accepted||'[[]]'),documents,frozen});
  }
  if(action==='copy'&&req.method==='POST'){
   const d=await body(req),target=sections.find(s=>s.id===d.sectionId);if(!target||(user.role!=='owner'&&target.instructor_id!==user.id))fail('No instructor access to the target section.',403);
   const newId=crypto.randomUUID(),docs=(await sql('SELECT * FROM documents WHERE assignment_id=?',id).all()).results;
   await env.DB.batch([sql("INSERT INTO assignments(id,section_id,unit,title,instructions,document,transaction_date,explanation,points,period_start,period_end,expected_reference,cash_flow,sort_order,published,release_mode) SELECT ?,?,unit,title || ' (copy)',instructions,document,transaction_date,explanation,points,period_start,period_end,expected_reference,cash_flow,sort_order,0,'locked' FROM assignments WHERE id=?",newId,d.sectionId,id),sql('INSERT INTO answer_keys SELECT ?,accepted FROM answer_keys WHERE assignment_id=?',newId,id),...docs.map(doc=>sql('INSERT INTO documents(id,assignment_id,object_key,filename,content_type,size) VALUES(?,?,?,?,?,?)',crypto.randomUUID(),newId,doc.object_key,doc.filename,doc.content_type,doc.size)),audit('assignment.copy',newId,{source:id,sectionId:d.sectionId})]);return json({id:newId},201);
  }
  if(action==='extension'&&req.method==='POST'){
   const d=await body(req);if(!await sql("SELECT e.user_id FROM enrollments e JOIN users u ON u.id=e.user_id WHERE e.user_id=? AND e.section_id=? AND u.role='student'",d.studentId,sectionId).first())fail('Student is not enrolled in this section.',404);
   const dueAt=iso(d.dueAt,'extension date');if(dueAt&&a.due_at&&dueAt<a.due_at)fail('An extension cannot shorten the assignment deadline.');
   await env.DB.batch([dueAt?sql('INSERT INTO extensions VALUES(?,?,?) ON CONFLICT(user_id,assignment_id) DO UPDATE SET due_at=excluded.due_at',d.studentId,id,dueAt):sql('DELETE FROM extensions WHERE user_id=? AND assignment_id=?',d.studentId,id),audit('assignment.extension',id,{studentId:d.studentId,dueAt})]);return json({ok:true});
  }
  if(action==='remove-document'&&req.method==='POST'){
   await editable(id);const d=await body(req),doc=await sql('SELECT * FROM documents WHERE id=? AND assignment_id=?',d.documentId,id).first<any>();if(!doc)fail('Document not found.',404);
   await env.DB.batch([sql('DELETE FROM documents WHERE id=?',doc.id),audit('document.remove',doc.id,{assignmentId:id})]);
   if(!await sql('SELECT id FROM documents WHERE object_key=? LIMIT 1',doc.object_key).first())await env.DOCUMENTS.delete(doc.object_key);
   return json({ok:true});
  }
  if(action==='upload'&&req.method==='POST'){
   await editable(id);const limit=10*1024*1024;if((await sql('SELECT COUNT(*) AS n FROM documents WHERE assignment_id=?',id).first<any>())!.n>=2)fail('Each assignment can have up to two uploaded documents.');
   let filename:string;try{filename=decodeURIComponent(req.headers.get('X-File-Name')||'document');}catch{fail('Invalid filename.');}filename=filename!.split(/[\\/]/).at(-1)!.replace(/[\x00-\x1f\x7f]/g,'').slice(0,180)||'document';
   if(Number(req.headers.get('content-length')||0)>limit)fail('Documents must be 10 MB or smaller.',413);
   const reader=req.body?.getReader();if(!reader)fail('Choose a file.');const chunks:Uint8Array[]=[];let size=0;
   while(true){const {done,value}=await reader!.read();if(done)break;size+=value.length;if(size>limit){await reader!.cancel();fail('Documents must be 10 MB or smaller.',413);}chunks.push(value);}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
   const starts=(p:number[])=>p.every((v,i)=>bytes[i]===v);const type=starts([37,80,68,70,45])?'application/pdf':starts([137,80,78,71,13,10,26,10])?'image/png':starts([255,216,255])?'image/jpeg':starts([82,73,70,70])&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP'?'image/webp':null;
   if(!type)fail('Upload an original PDF, PNG, JPEG or WebP file.',415);
   const docId=crypto.randomUUID(),key='assignments/'+id+'/'+docId;await env.DOCUMENTS.put(key,bytes,{httpMetadata:{contentType:type!}});
   try{await env.DB.batch([sql('INSERT INTO documents(id,assignment_id,object_key,filename,content_type,size) VALUES(?,?,?,?,?,?)',docId,id,key,filename,type,size),audit('document.upload',docId,{assignmentId:id,size})]);}catch(e){await env.DOCUMENTS.delete(key);if(String(e).includes('Document limit'))fail('Each assignment can have up to two uploaded documents.');if(String(e).includes('frozen'))fail('Source documents are frozen after student work starts.',409);throw e;}
   return json({id:docId,filename,content_type:type,size},201);
  }
 }
 const file=path.match(/^\/api\/documents\/([a-zA-Z0-9-]+)$/);
 if(file&&req.method==='GET'){
  const doc=await sql('SELECT d.*,a.published,a.release_mode,a.opens_at FROM documents d JOIN assignments a ON a.id=d.assignment_id WHERE d.id=? AND a.section_id=?',file[1],sectionId).first<any>();if(!doc)fail('Document not found.',404);if(!instructor&&!available(doc))fail('This assignment is locked.',403);
  const object=await env.DOCUMENTS.get(doc.object_key);if(!object)fail('Document not found.',404);
  return new Response(object!.body,{headers:{'Content-Type':doc.content_type,'Content-Length':String(doc.size),'Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; frame-ancestors 'self'"}});
 }
 if(path==='/api/reports'&&req.method==='GET'){
  if(!instructor&&!section.reports_unlocked)fail('Your instructor has not unlocked financial statements.',403);
  const studentId=url.searchParams.get('student')||user.id;if(studentId!==user.id&&(!instructor||!await sql("SELECT e.user_id FROM enrollments e JOIN users u ON u.id=e.user_id WHERE e.user_id=? AND e.section_id=? AND u.role='student'",studentId,sectionId).first()))fail('No access to this student record.',403);
  const lines=(await sql('SELECT l.*,e.date,a.cash_flow FROM lines l JOIN entries e ON e.id=l.entry_id JOIN assignments a ON a.id=e.assignment_id WHERE e.user_id=? AND a.section_id=?',studentId,sectionId).all<Line&{date:string;cash_flow:string}>()).results;
  const ledger=await courseLedger(c,studentId);return json(financialStatements(accounts,(ledger?.lines||lines) as any));
 }
 if(path==='/api/grades.csv'&&req.method==='GET'){
  staff();const student=url.searchParams.get('student')||'',activity=url.searchParams.get('assignment')||'';
  const rows=(await sql("SELECT u.name,u.email,a.title,a.points,CASE WHEN e.id IS NOT NULL THEN a.points ELSE 0 END AS earned,e.created_at,(SELECT COUNT(*) FROM attempts t WHERE t.user_id=u.id AND t.assignment_id=a.id) AS attempts FROM users u JOIN enrollments en ON en.user_id=u.id JOIN assignments a ON a.section_id=en.section_id LEFT JOIN student_submissions e ON e.user_id=u.id AND e.assignment_id=a.id WHERE en.section_id=? AND u.role='student' AND a.published=1 AND (?='' OR u.id=?) AND (?='' OR a.id=?) ORDER BY u.name,a.unit,a.sort_order",sectionId,student,student,activity,activity).all()).results;
  const csv=(v:unknown)=>'"'+String(v??'').replace(/^[\s]*[=+@-]/,"'$&").replaceAll('"','""')+'"';const content=[['Student','Email','Assignment','Points','Possible','Submitted at','Attempts'],...rows.map(r=>[r.name,r.email,r.title,r.earned,r.points,r.created_at,r.attempts])].map(row=>row.map(csv).join(',')).join('\r\n');
  return new Response(content,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="cape-fear-grades.csv"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }
 return null;
}
