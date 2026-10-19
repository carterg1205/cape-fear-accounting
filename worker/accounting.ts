export type Line = {account:string; debit:number; credit:number};
export type Account = {id:string; name:string; type:'asset'|'liability'|'equity'|'revenue'|'expense'; normal:'debit'|'credit'};
export function validate(lines:Line[], accounts:Account[], accepted?:Line[][]){
 if(!Array.isArray(lines)||lines.length<2||lines.length>30) return 'Use between two and thirty journal lines.';
 for(const l of lines){
  if(!l||typeof l!=='object'||!accounts.some(a=>a.id===l.account)) return 'Select a valid account for every line.';
  if(!Number.isSafeInteger(l.debit)||!Number.isSafeInteger(l.credit)||l.debit<0||l.credit<0||l.debit>1e11||l.credit>1e11||(l.debit===0)===(l.credit===0)) return 'Each line needs a positive amount on exactly one side, in cents.';
 }
 if(lines.reduce((s,l)=>s+l.debit-l.credit,0)!==0)return 'Total debits must equal total credits.';
 const normalize=(ls:Line[])=>{const m=new Map<string,number[]>();for(const l of ls){const k=l.account;const v=m.get(k)||[0,0];m.set(k,[v[0]+l.debit,v[1]+l.credit]);}return JSON.stringify([...m].sort(([a],[b])=>a.localeCompare(b)));};
 if(accepted&&!accepted.some(a=>normalize(a)===normalize(lines)))return 'Your entry balances. Review the document, account classifications, debit/credit directions, and amounts.';
 return null;
}
export function trialBalance(accounts:Account[],lines:Line[]){return accounts.map(a=>{const net=lines.filter(l=>l.account===a.id).reduce((s,l)=>s+l.debit-l.credit,0);return {...a,debit:Math.max(net,0),credit:Math.max(-net,0),balance:a.normal==='debit'?net:-net};});}
export function cents(s:string){if(!/^\d+(\.\d{1,2})?$/.test(s))throw Error('Enter a nonnegative amount with up to two decimals.');const [w,f='']=s.split('.');const n=Number(w)*100+Number(f.padEnd(2,'0'));if(!Number.isSafeInteger(n))throw Error('Amount too large.');return n;}
