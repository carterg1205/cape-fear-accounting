import {describe,it,expect} from 'vitest';
import {referenceFeedback,financialStatements,type Account} from '../worker/accounting';
import {easternInput,easternIso,courseUnits} from '../src/course';
describe('reference and course dates',()=>{
 it('requires an exact document reference while tolerating outside whitespace',()=>{expect(referenceFeedback(' INV-2084 ','INV-2084')).toBeNull();for(const v of ['',undefined,'inv-2084','INV2084','INV-2085'])expect(referenceFeedback(v,'INV-2084')).toContain('match');});
 it('converts Eastern dates correctly in winter, summer and the DST transition',()=>{expect(easternIso('2027-01-15T12:00')).toBe('2027-01-15T17:00:00.000Z');expect(easternIso('2027-07-15T12:00')).toBe('2027-07-15T16:00:00.000Z');expect(easternIso('2027-03-14T03:30')).toBe('2027-03-14T07:30:00.000Z');expect(()=>easternIso('2027-03-14T02:30')).toThrow();expect(easternInput('2027-01-15T17:00:00.000Z')).toBe('2027-01-15T12:00');expect(courseUnits).toHaveLength(13);});
});
describe('financial statement relationships',()=>{
 it('handles contra assets, losses, dividends and separates noncash entries from cash flows',()=>{
 const accounts:Account[]=[{id:'1010',name:'Cash',type:'asset',normal:'debit'},{id:'1500',name:'Equipment',type:'asset',normal:'debit'},{id:'1510',name:'Accumulated depreciation',type:'asset',normal:'credit'},{id:'3010',name:'Stock',type:'equity',normal:'credit'},{id:'3100',name:'RE',type:'equity',normal:'credit'},{id:'3200',name:'Dividends',type:'equity',normal:'debit'},{id:'5300',name:'Depreciation',type:'expense',normal:'debit'}];
 const entry=(flow:string,lines:[string,number,number][])=>lines.map(([account,debit,credit])=>({account,debit,credit,cash_flow:flow,date:'2027-01-31'}));
 const r=financialStatements(accounts,[...entry('financing',[['1010',100000,0],['3010',0,100000]]),...entry('investing',[['1500',40000,0],['1010',0,40000]]),...entry('none',[['5300',1000,0],['1510',0,1000]]),...entry('financing',[['3200',5000,0],['1010',0,5000]])]);
 expect(r.assets).toBe(94000);expect(r.netIncome).toBe(-1000);expect(r.retainedEarnings).toBe(-6000);expect(r.equity).toBe(94000);expect(r.equationDifference).toBe(0);expect(r.cashFlows).toEqual({operating:0,investing:-40000,financing:95000,unclassified:0});expect(r.cash).toBe(55000);
 });
});
