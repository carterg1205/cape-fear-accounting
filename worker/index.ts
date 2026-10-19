import { validate, trialBalance, type Account, type Line } from './accounting';
interface Env {DB:D1Database;DOCUMENTS:R2Bucket;ASSETS:Fetcher;ENVIRONMENT:string;DEV_AUTH?:string}
type User={id:string;name:string;email:string;role:'student'|'instructor'|'owner'};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function fail(message:string,status=400):never {throw Object.assign(new Error(message),{status});}
const digest=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,'0')).join('');
async function password(secret:string,salt:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),'PBKDF2',false,['deriveBits']);return Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256))).map(b=>b.toString(16).padStart(2,'0')).join('');}
const open=(a:any)=>a.release_mode==='open'||(a.release_mode==='scheduled'&&a.opens_at&&Date.parse(a.opens_at)<=Date.now());
async function body(req:Request){if(Number(req.headers.get('content-length')||0)>20000)fail('Request too large.',413);const t=await req.text();if(t.length>20000)fail('Request too large.',413);try{return JSON.parse(t);}catch{fail('Invalid JSON.');}}
export default {async fetch(req:Request,env:Env):Promise<Response>{
 const url=new URL(req.url),path=url.pathname;
 if(!path.startsWith('/api/'))return env.ASSETS.fetch(req);
 try{
  if(!['GET','HEAD'].includes(req.method)&&req.headers.get('Origin')!==url.origin)fail('Origin check failed.',403);
  const sql=(s:string,...args:any[])=>env.DB.prepare(s).bind(...args);
  const local=env.ENVIRONMENT==='local'&&env.DEV_AUTH==='true'&&['localhost','127.0.0.1'].includes(url.hostname);
  if(path==='/api/login'&&req.method==='POST'){
   const data=await body(req);let user:User|null=null;
   const ip=req.headers.get('CF-Connecting-IP')||'local',bucket=Math.floor(Date.now()/900000);
   const limit=await sql('INSERT INTO login_limits(key,count,window) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END,window=excluded.window RETURNING count',ip,bucket).first<{count:number}>();
   if(limit&&limit.count>20)fail('Too many login attempts. Try again in 15 minutes.',429);
   if(local&&['student','instructor'].includes(data.demo)){
    const id='local-'+data.demo;
    await env.DB.batch([sql('INSERT OR IGNORE INTO users(id,name,email,role) VALUES(?,?,?,?)',id,data.demo==='student'?'Jamie Parker':'Carter Godwin',id+'@example.test',data.demo),sql('INSERT OR IGNORE INTO enrollments VALUES(?,?)',id,'acg201')]);
    if(data.demo==='instructor')await sql('UPDATE sections SET instructor_id=? WHERE id=? AND instructor_id IS NULL',id,'acg201').run();
    user=await sql('SELECT id,name,email,role FROM users WHERE id=?',id).first<User>();
   }else{
    if(typeof data.email!=='string'||typeof data.password!=='string'||data.password.length>256)fail('Enter your email and passphrase.',401);
    const u=await sql('SELECT * FROM users WHERE email=? AND active=1',data.email.trim().toLowerCase()).first<any>();
    const computed=await password(data.password,u?.salt||'unknown-user-salt');
    if(!u?.password_hash||computed!==u.password_hash)fail('Email or passphrase is incorrect.',401);
    user={id:u.id,name:u.name,email:u.email,role:u.role};
   }
   if(!user)fail('Unable to sign in.',401);
   const token=crypto.randomUUID()+crypto.randomUUID();await sql('INSERT INTO sessions VALUES(?,?,?)',await digest(token),user.id,Date.now()+8*3600000).run();
   return new Response(JSON.stringify({user}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':`session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${url.protocol==='https:'?'; Secure':''}`}});
  }
  if(path==='/api/config')return json({local});
  const token=req.headers.get('Cookie')?.match(/(?:^|;\s*)session=([^;]+)/)?.[1];
  const user=token?await sql('SELECT u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await digest(token),Date.now()).first<User>():null;
  if(!user)fail('Please sign in.',401);
  if(path==='/api/logout'&&req.method==='POST'){await sql('DELETE FROM sessions WHERE token_hash=?',await digest(token!)).run();return new Response('{}',{headers:{'Set-Cookie':'session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0','Content-Type':'application/json'}});}
  const sections=(await sql(user.role==='owner'?'SELECT * FROM sections':'SELECT DISTINCT s.* FROM sections s LEFT JOIN enrollments e ON e.section_id=s.id WHERE e.user_id=? OR s.instructor_id=?',...(user.role==='owner'?[]:[user.id,user.id])).all()).results;
  const sectionId=url.searchParams.get('section')||String(sections[0]?.id||'');
  if(!sections.some(s=>s.id===sectionId))fail('No access to this section.',403);
  const section=sections.find(s=>s.id===sectionId);
  const instructor=user.role==='owner'||(user.role==='instructor'&&section?.instructor_id===user.id);
  const accounts=(await sql('SELECT * FROM accounts ORDER BY id').all<Account>()).results;
  if(path==='/api/state'&&req.method==='GET'){
   const assignments=(await sql('SELECT a.*,e.id AS entry_id,e.created_at AS submitted_at,(SELECT COUNT(*) FROM attempts t WHERE t.user_id=? AND t.assignment_id=a.id) AS attempts FROM assignments a LEFT JOIN entries e ON e.assignment_id=a.id AND e.user_id=? WHERE a.section_id=? ORDER BY a.transaction_date',user.id,user.id,sectionId).all()).results.map((a:any)=>{
    const unlocked=open(a);const safe={...a,unlocked};delete safe.explanation;
    if(!instructor&&!unlocked){delete safe.document;delete safe.instructions;}if(a.entry_id)safe.explanation=a.explanation;return safe;
   });
   const entries=(await sql('SELECT e.* FROM entries e JOIN assignments a ON a.id=e.assignment_id WHERE e.user_id=? AND a.section_id=? ORDER BY e.date,e.created_at',user.id,sectionId).all()).results;
   const lines=(await sql('SELECT l.*,e.date,e.memo,e.reference FROM lines l JOIN entries e ON e.id=l.entry_id JOIN assignments a ON a.id=e.assignment_id WHERE e.user_id=? AND a.section_id=? ORDER BY e.date,e.created_at,l.id',user.id,sectionId).all<Line>()).results;
   const drafts=(await sql('SELECT d.* FROM drafts d JOIN assignments a ON a.id=d.assignment_id WHERE d.user_id=? AND a.section_id=?',user.id,sectionId).all()).results;
   return json({user,sections,section,accounts,assignments,entries,lines,trial:trialBalance(accounts,lines),drafts});
  }
  if(path==='/api/instructor'&&req.method==='GET'){
   if(!instructor)fail('Instructor access required.',403);
   const students=(await sql("SELECT u.id,u.name,u.email FROM users u JOIN enrollments e ON e.user_id=u.id WHERE e.section_id=? AND u.role='student'",sectionId).all()).results;
   const submissions=(await sql('SELECT e.*,a.title,a.points,u.name FROM entries e JOIN assignments a ON a.id=e.assignment_id JOIN users u ON u.id=e.user_id WHERE a.section_id=?',sectionId).all()).results;
   const attempts=(await sql('SELECT t.*,u.name,a.title FROM attempts t JOIN users u ON u.id=t.user_id JOIN assignments a ON a.id=t.assignment_id WHERE a.section_id=? ORDER BY t.created_at DESC LIMIT 200',sectionId).all()).results;
   return json({students,submissions,attempts});
  }
  const match=path.match(/^\/api\/assignments\/([a-zA-Z0-9-]+)\/(draft|check|post|release)$/);
  if(match&&req.method==='POST'){
   const [,id,action]=match;
   const a=await sql('SELECT * FROM assignments WHERE id=? AND section_id=?',id,sectionId).first<any>();if(!a)fail('Assignment not found.',404);
   const data=await body(req);
   if(action==='release'){
    if(!instructor)fail('Instructor access required.',403);
    if(!['locked','open','scheduled'].includes(data.mode))fail('Invalid release mode.');
    if(data.mode==='scheduled'&&(!data.opensAt||!Number.isFinite(Date.parse(data.opensAt))))fail('Choose a valid opening time.');
    await env.DB.batch([sql('UPDATE assignments SET release_mode=?,opens_at=? WHERE id=?',data.mode,data.mode==='scheduled'?new Date(data.opensAt).toISOString():null,id),sql('INSERT INTO audit(id,actor,action,target,details) VALUES(?,?,?,?,?)',crypto.randomUUID(),user.id,'assignment.release',id,JSON.stringify(data))]);return json({ok:true});
   }
   if(user.role!=='student')fail('Only students can submit accounting work.',403);
   if(!open(a))fail('Your instructor has not released this assignment.',403);
   if(a.due_at&&Date.parse(a.due_at)<Date.now())fail('The assignment deadline has passed.',403);
   if(await sql('SELECT id FROM entries WHERE user_id=? AND assignment_id=?',user.id,id).first())fail('This transaction has already been posted.',409);
   if(action==='draft'){await sql('INSERT INTO drafts VALUES(?,?,?) ON CONFLICT(user_id,assignment_id) DO UPDATE SET body=excluded.body',user.id,id,JSON.stringify(data)).run();return json({ok:true});}
   const key=await sql('SELECT accepted FROM answer_keys WHERE assignment_id=?',id).first<{accepted:string}>();
   if(!key)fail('Assignment answer key is unavailable.',503);
   let feedback=validate(data.lines,accounts,JSON.parse(key.accepted));
   if(!feedback&&(typeof data.date!=='string'||data.date!==a.transaction_date||data.date<a.period_start||data.date>a.period_end))feedback='Review the transaction date and the open accounting period.';
   if(!feedback&&(typeof data.memo!=='string'||!data.memo.trim()||data.memo.length>500||typeof data.reference!=='string'||data.reference.length>80))feedback='Add a memo and use a reference of at most 80 characters.';
   const attempt=sql('INSERT INTO attempts(id,user_id,assignment_id,body,feedback,correct) VALUES(?,?,?,?,?,?)',crypto.randomUUID(),user.id,id,JSON.stringify(data),feedback||'Entry is correct.',feedback?0:1);
   if(feedback||action==='check'){await attempt.run();return json({correct:!feedback,feedback:feedback||'Your entry is correct and ready to post.'});}
   const entryId=crypto.randomUUID();
   try{await env.DB.batch([attempt,sql('INSERT INTO entries(id,user_id,assignment_id,date,memo,reference) VALUES(?,?,?,?,?,?)',entryId,user.id,id,data.date,data.memo.trim(),data.reference),...data.lines.map((l:Line)=>sql('INSERT INTO lines(entry_id,account,debit,credit) VALUES(?,?,?,?)',entryId,l.account,l.debit,l.credit)),sql('DELETE FROM drafts WHERE user_id=? AND assignment_id=?',user.id,id)]);}catch(e){if(String(e).includes('UNIQUE'))fail('This transaction has already been posted.',409);throw e;}
   return json({correct:true,posted:true,feedback:a.explanation});
  }
  return json({error:'Route not found.'},404);
 }catch(e:any){if(!e.status)console.error('Request failed',e.message);return json({error:e.status?e.message:'The request could not be completed.'},e.status||500);}
}};
