import {describe,it,expect} from 'vitest';
import {validate,trialBalance,cents,type Account} from '../worker/accounting';
const accounts:Account[]=[{id:'cash',name:'Cash',type:'asset',normal:'debit'},{id:'stock',name:'Stock',type:'equity',normal:'credit'},{id:'revenue',name:'Revenue',type:'revenue',normal:'credit'}];
const key=[{account:'cash',debit:2000,credit:0},{account:'stock',debit:0,credit:2000}];
describe('manual accounting engine',()=>{
 it('accepts correct and reordered compound lines',()=>{expect(validate(key,accounts,[key])).toBeNull();expect(validate([{account:'stock',debit:0,credit:2000},{account:'cash',debit:1000,credit:0},{account:'cash',debit:1000,credit:0}],accounts,[key])).toBeNull();});
 it('rejects balanced but conceptually wrong accounts and reversed directions',()=>{expect(validate([key[0],{account:'revenue',debit:0,credit:2000}],accounts,[key])).toContain('balances');expect(validate(key.map(l=>({...l,debit:l.credit,credit:l.debit})),accounts,[key])).toContain('balances');});
 it('rejects unbalanced, zero, negative, unknown, noninteger and two-sided lines',()=>{for(const l of [{account:'cash',debit:1,credit:1},{account:'cash',debit:0,credit:0},{account:'cash',debit:-1,credit:0},{account:'cash',debit:0.1,credit:0},{account:'unknown',debit:2000,credit:0},{account:'cash',debit:1999,credit:0}])expect(validate([l,key[1]],accounts)).toBeTruthy();});
 it('computes signed balances including abnormal balances',()=>{const t=trialBalance(accounts,key);expect(t[0].balance).toBe(2000);expect(t[1].balance).toBe(2000);expect(t.reduce((s,a)=>s+a.debit-a.credit,0)).toBe(0);expect(trialBalance(accounts,[{account:'cash',debit:0,credit:500}])[0].balance).toBe(-500);});
 it('parses money exactly and rejects extra decimals',()=>{expect(cents('0.29')).toBe(29);expect(cents('3800.5')).toBe(380050);expect(()=>cents('1.001')).toThrow();});
});
