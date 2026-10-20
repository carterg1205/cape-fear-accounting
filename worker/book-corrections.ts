import {compileCourse,type RecordRow} from './course-engine';
import {validate,type Account,type Line} from './accounting';
export function correctionTime(due:unknown,delayHours:number){if(typeof due!=='string'||!Number.isFinite(Date.parse(due)))return null;return new Date(Date.parse(due)+delayHours*3600000).toISOString();}
// Corrections are separate business records. They never create a student submission or earn points.
export async function reconcileBooks(db:D1Database,scope?:{sectionId:string;studentId:string},now=new Date()){
 const sql=(s:string,...args:any[])=>db.prepare(s).bind(...args),at=now.toISOString();
 const accounts=(await sql('SELECT * FROM accounts').all<Account>()).results;
 const compiled=new Map<string,ReturnType<typeof compileCourse>>();
 // A 25-record batch stays within the free-tier D1 query budget. State/report requests catch up the requesting student too.
 {
  const rows=(await sql(`SELECT a.*,en.user_id,COALESCE(x.due_at,a.due_at) AS effective_due_at,s.book_correction_delay_hours,v.params,v.model_version,k.accepted
   FROM assignments a JOIN sections s ON s.id=a.section_id JOIN enrollments en ON en.section_id=s.id JOIN users u ON u.id=en.user_id
   JOIN answer_keys k ON k.assignment_id=a.id LEFT JOIN course_versions v ON v.id=a.course_version
   LEFT JOIN extensions x ON x.assignment_id=a.id AND x.user_id=en.user_id
   WHERE u.role='student' AND u.active=1 AND s.book_correction_enabled=1 AND a.published=1
   AND (a.course_version IS NULL OR a.course_version=s.course_version)
   AND (a.first_released_at IS NOT NULL OR a.release_mode='open' OR (a.release_mode='scheduled' AND julianday(a.opens_at)<=julianday(?)))
   AND (julianday(COALESCE(x.due_at,a.due_at))+s.book_correction_delay_hours/24.0)<=julianday(?)
   AND (a.activity_type='journal' OR a.template_key IN ('u1a','u1b'))
   AND NOT EXISTS(SELECT 1 FROM entries e WHERE e.assignment_id=a.id AND e.user_id=en.user_id)
   AND NOT EXISTS(SELECT 1 FROM book_corrections b WHERE b.assignment_id=a.id AND b.user_id=en.user_id)
   AND (? IS NULL OR s.id=?) AND (? IS NULL OR en.user_id=?) ORDER BY a.unit,a.sort_order,en.user_id LIMIT 25`,at,at,scope?.sectionId||null,scope?.sectionId||null,scope?.studentId||null,scope?.studentId||null).all<any>()).results;
  if(!rows.length)return 0;
  const statements:D1PreparedStatement[]=[];
  for(const a of rows){
   let records:RecordRow[]=[];
   if(a.activity_type==='journal'){
    const key=JSON.parse(a.accepted);if(!Array.isArray(key)||validate(key[0],accounts))continue;
    records=[{unit:a.unit,date:a.transaction_date,memo:a.title,reference:a.expected_reference,cash_flow:a.cash_flow,lines:key[0]}];
   }else if(a.params){
    if(!compiled.has(a.course_version))compiled.set(a.course_version,compileCourse(JSON.parse(a.params),Number(a.model_version)||1));
    records=compiled.get(a.course_version)!.records.filter(r=>r.activityKey===a.template_key).map(r=>({...r,reference:a.expected_reference}));
   }
   if(!records.length)continue;
   // Recheck live release, deadline, extension, enrollment and revision in the INSERT transaction.
   statements.push(sql(`INSERT OR IGNORE INTO book_corrections(id,user_id,assignment_id,course_revision,records,effective_at)
    SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM assignments a JOIN sections s ON s.id=a.section_id
     JOIN enrollments en ON en.section_id=s.id JOIN users u ON u.id=en.user_id LEFT JOIN extensions x ON x.assignment_id=a.id AND x.user_id=en.user_id
     WHERE a.id=? AND en.user_id=? AND u.role='student' AND u.active=1 AND s.book_correction_enabled=1 AND a.published=1
     AND (a.course_version IS NULL OR a.course_version=s.course_version) AND a.course_revision IS ?
     AND (a.first_released_at IS NOT NULL OR a.release_mode='open' OR (a.release_mode='scheduled' AND julianday(a.opens_at)<=julianday(?)))
     AND (julianday(COALESCE(x.due_at,a.due_at))+s.book_correction_delay_hours/24.0)<=julianday(?)
     AND COALESCE(x.due_at,a.due_at)=? AND s.book_correction_delay_hours=?
     AND EXISTS(SELECT 1 FROM answer_keys k WHERE k.assignment_id=a.id AND k.accepted=?) AND a.document=? AND a.cash_flow=?
     AND NOT EXISTS(SELECT 1 FROM entries e WHERE e.assignment_id=a.id AND e.user_id=en.user_id))`,crypto.randomUUID(),a.user_id,a.id,a.course_revision,JSON.stringify(records),correctionTime(a.effective_due_at,a.book_correction_delay_hours),a.id,a.user_id,a.course_revision,at,at,a.effective_due_at,a.book_correction_delay_hours,a.accepted,a.document,a.cash_flow));
  }
  if(!statements.length)return 0;
  const results=await db.batch(statements);return results.reduce((n,r)=>n+(r.meta.changes||0),0);
 }
}
export async function correctionLedger(db:D1Database,studentId:string,sectionId:string,version:string|null,unit=13){
 const rows=(await db.prepare(`SELECT b.*,a.unit FROM book_corrections b JOIN assignments a ON a.id=b.assignment_id
  WHERE b.user_id=? AND a.section_id=? AND a.course_version IS ? AND a.unit<=?
  AND (a.activity_type<>'journal' OR NOT EXISTS(SELECT 1 FROM entries e WHERE e.user_id=b.user_id AND e.assignment_id=b.assignment_id))
  ORDER BY a.unit,a.sort_order,b.effective_at`).bind(studentId,sectionId,version,unit).all<any>()).results;
 const entries=rows.flatMap(b=>JSON.parse(b.records).map((r:RecordRow,i:number)=>({id:b.id+'-'+i,assignment_id:b.assignment_id,date:r.date,memo:'Automatic book correction · '+r.memo,reference:r.reference,created_at:b.created_at,effective_at:b.effective_at,system:true,lines:r.lines,cash_flow:r.cash_flow})));
 return {entries,lines:entries.flatMap(e=>e.lines.map((l:Line)=>({...l,date:e.date,memo:e.memo,reference:e.reference,cash_flow:e.cash_flow,system:true,provided:true,effective_at:e.effective_at}))),count:rows.length};
}
