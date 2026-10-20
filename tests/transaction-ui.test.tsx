// @vitest-environment jsdom
import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {AccountPicker} from '../src/AccountPicker';
import {TransactionDetails} from '../src/Lesson';
import {transactionPresentation,limitedAccounts} from '../worker/transaction-presentation';
import {compileCourse} from '../worker/course-engine';
import {validate,type Account} from '../worker/accounting';
afterEach(cleanup);
const accounts:Account[]=[{id:'1010',name:'Cash',type:'asset',normal:'debit'},{id:'1200',name:'Merchandise inventory',type:'asset',normal:'debit'},{id:'2010',name:'Accounts payable',type:'liability',normal:'credit'}];
describe('searchable accounts and supporting records',()=>{
 it('filters by name and code, requires selection and supports keyboard choice',()=>{const changed=vi.fn();render(<AccountPicker accounts={accounts} value="" onChange={changed} label="Account line 1"/>);const input=screen.getByRole('combobox');fireEvent.change(input,{target:{value:'invent'}});expect(screen.getAllByRole('option')).toHaveLength(1);expect(changed).toHaveBeenLastCalledWith('');fireEvent.keyDown(input,{key:'Enter'});expect(changed).toHaveBeenLastCalledWith('1200');expect(screen.queryByRole('listbox')).toBeNull();fireEvent.change(input,{target:{value:'2010'}});fireEvent.click(screen.getByRole('option'));expect(changed).toHaveBeenLastCalledWith('2010');});
 it('does not select an account for an unmatched search and closes with Escape',()=>{const changed=vi.fn();render(<AccountPicker accounts={accounts} value="" onChange={changed} label="Account"/>);const input=screen.getByRole('combobox');fireEvent.change(input,{target:{value:'not an account'}});expect(screen.getByText(/No matching/)).toBeTruthy();fireEvent.keyDown(input,{key:'Enter'});expect(changed).not.toHaveBeenCalledWith('1010');fireEvent.keyDown(input,{key:'Escape'});expect(screen.queryByRole('listbox')).toBeNull();});
 it('keeps the invoice supplemental and puts the whole task in the question',()=>{const c=compileCourse({}),a=c.activities.find(a=>a.key==='u4a'),assignment={template_key:a.key,activity_type:'journal',unit:4,instructions:a.intro,transaction_date:a.date,document:JSON.stringify({reference:a.reference,detail:a.detail}),activity_data:JSON.stringify(a.activity)};const p=transactionPresentation(assignment,c.params);expect(p.question).toContain('Prepare the journal entry');expect(p.question).toContain('5 surfboards');expect(p.question).toContain('$380');expect(p.supportingDocument!.rows[0]).toEqual({description:'Surfboard — shop inventory',quantity:5,unitPrice:38000,amount:190000});render(<TransactionDetails assignment={{...assignment,...p}}/>);expect(screen.getByText('Supporting record')).toBeTruthy();expect(screen.getByText(/Prepare the journal entry to record the inventory purchase on account/)).toBeTruthy();expect(screen.getByText('Net 30 · no freight charges')).toBeTruthy();});
 it('retains every accepted account when limiting choices, including custom exercises',()=>{const custom={id:'9999',name:'Custom account',type:'expense' as const,normal:'debit' as const};expect(limitedAccounts(4,[...accounts,custom],[[{account:'9999',debit:100,credit:0}]])).toContain('9999');});
});
describe('specific entry diagnostics',()=>{
 const correct=[{account:'1200',debit:190000,credit:0},{account:'2010',debit:0,credit:190000}];
 it('identifies the line and wrong account without supplying the missing answer',()=>{const feedback=validate([{account:'1010',debit:190000,credit:0},correct[1]],accounts,[correct])!;expect(feedback).toContain('Line 1 (Cash)');expect(feedback).toContain('account selection');expect(feedback).not.toContain('Merchandise inventory');expect(feedback).toContain('One required account is missing');});
 it('distinguishes side errors from amount errors',()=>{expect(validate(correct.map(l=>({...l,debit:l.credit,credit:l.debit})),accounts,[correct])).toContain('Line 1 (Merchandise inventory): the amount is on the wrong side; use Debit');expect(validate(correct.map(l=>({...l,debit:l.debit?180000:0,credit:l.credit?180000:0})),accounts,[correct])).toContain('Line 1 (Merchandise inventory): review the debit amount');});
 it('reports the exact imbalance and aggregates split lines without false errors',()=>{expect(validate([{...correct[0],debit:180000},correct[1]],accounts,[correct])).toContain('differ by $100.00');expect(validate([{account:'1200',debit:90000,credit:0},{account:'1200',debit:100000,credit:0},correct[1]],accounts,[correct])).toBeNull();});
});
