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

export function referenceFeedback(reference:unknown,expected:string){return typeof reference==='string'&&reference.trim()===expected.trim()&&expected.trim()?null:'The reference number must match the source document exactly. Check its letters, numbers, and punctuation.';}
export function financialStatements(accounts:Account[],lines:(Line&{date?:string;cash_flow?:string})[]){
 const trial=trialBalance(accounts,lines),signed=(a:typeof trial[number])=>a.debit-a.credit;
 const total=(type:string)=>trial.filter(a=>a.type===type).reduce((s,a)=>s+signed(a)*(type==='asset'||type==='expense'?1:-1),0);
 const netIncome=total('revenue')-total('expense');
 const balance=(id:string)=>{const a=trial.find(a=>a.id===id);return a?signed(a):0;};
 const retainedEarnings=-balance('3100')+netIncome-balance('3200'),equity=total('equity')+netIncome;
 const cashFlows={operating:0,investing:0,financing:0,unclassified:0};
 for(const l of lines.filter(l=>l.account==='1010')){const category=l.cash_flow as keyof typeof cashFlows;cashFlows[category in cashFlows?category:'unclassified']+=l.debit-l.credit;}
 return {trial,revenue:total('revenue'),expenses:total('expense'),netIncome,assets:total('asset'),liabilities:total('liability'),equity,commonStock:-balance('3010'),openingRetainedEarnings:-balance('3100'),dividends:balance('3200'),retainedEarnings,cash:balance('1010'),cashFlows,equationDifference:total('asset')-total('liability')-equity,through:lines.map(l=>l.date||'').sort().at(-1)||null};
}
