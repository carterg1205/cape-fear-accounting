export type Line = {account:string; debit:number; credit:number};
export type Account = {id:string; name:string; type:'asset'|'liability'|'equity'|'revenue'|'expense'; normal:'debit'|'credit'};
export function validate(lines:Line[], accounts:Account[], accepted?:Line[][]){
 if(!Array.isArray(lines)||lines.length<2||lines.length>30)return 'Use between two and thirty journal lines.';
 for(let i=0;i<lines.length;i++){const l=lines[i],label='Line '+(i+1)+': ';if(!l||typeof l!=='object'||!accounts.some(a=>a.id===l.account))return label+'select a valid account.';
  if(!Number.isSafeInteger(l.debit)||!Number.isSafeInteger(l.credit)||l.debit<0||l.credit<0||l.debit>1e11||l.credit>1e11)return label+'enter a nonnegative dollar amount with no more than two decimals.';
  if(l.debit===0&&l.credit===0)return label+'enter an amount in either Debit or Credit.';
  if(l.debit>0&&l.credit>0)return label+'use only one column: Debit or Credit, not both.';
 }
 const totals=(ls:Line[])=>{const m=new Map<string,number[]>();for(const l of ls){const v=m.get(l.account)||[0,0];m.set(l.account,[v[0]+l.debit,v[1]+l.credit]);}return m;};
 const normalize=(ls:Line[])=>JSON.stringify([...totals(ls)].sort(([a],[b])=>a.localeCompare(b)));
 const debit=lines.reduce((s,l)=>s+l.debit,0),credit=lines.reduce((s,l)=>s+l.credit,0),money=(v:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v/100);
 const balanced=debit===credit;
 if(accepted?.some(a=>normalize(a)===normalize(lines)))return null;
 const prefix=balanced?'Your entry balances, but needs review.':`Total debits ${money(debit)} and credits ${money(credit)} differ by ${money(Math.abs(debit-credit))}.`;
 if(!accepted)return balanced?null:prefix;
 if(!accepted.length)return 'The answer key is unavailable.';
 const actual=totals(lines),score=(answer:Line[])=>{const target=totals(answer);return [...new Set([...actual.keys(),...target.keys()])].reduce((s,id)=>{const a=actual.get(id),b=target.get(id);return s+(!a||!b?4:(a[0]!==b[0]?1:0)+(a[1]!==b[1]?1:0));},0);};
 const closest=[...accepted].sort((a,b)=>score(a)-score(b))[0],target=totals(closest),issues:string[]=[];
 for(const [id,values] of actual){const expected=target.get(id),indices=lines.flatMap((l,i)=>l.account===id?[i+1]:[]),label=(indices.length===1?'Line '+indices[0]:'Lines '+indices.join(', '))+' ('+(accounts.find(a=>a.id===id)?.name||id)+'): ';
  if(!expected){issues.push(label+'this account does not belong in this transaction. Review the account selection.');continue;}
  if(values[0]===expected[0]&&values[1]===expected[1])continue;
  if(expected[0]===0&&values[0]>0&&values[1]===0){issues.push(label+'the amount is on the wrong side; use Credit.');continue;}
  if(expected[1]===0&&values[1]>0&&values[0]===0){issues.push(label+'the amount is on the wrong side; use Debit.');continue;}
  const sides=[values[0]!==expected[0]?'debit':null,values[1]!==expected[1]?'credit':null].filter(Boolean).join(' and ');issues.push(label+'review the '+sides+' amount'+(indices.length>1?' across these lines':'')+'.');
 }
 const missing=[...target.keys()].filter(id=>!actual.has(id)).length;if(missing)issues.push(missing===1?'One required account is missing from the entry.':'Some required accounts are missing from the entry.');
 return [prefix,...issues.slice(0,6)].join('\n');
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
