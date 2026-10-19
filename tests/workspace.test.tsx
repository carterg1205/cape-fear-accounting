// @vitest-environment jsdom
import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {App} from '../src/main';
const state={user:{id:'s',name:'Jamie Parker',role:'student'},section:{name:'ACG 201',weight:5},sections:[],accounts:[{id:'1010',name:'Cash'},{id:'3010',name:'Common stock'}],assignments:[{id:'capital',title:'A new beginning',unit:1,points:10,unlocked:true,attempts:0,instructions:'Record the stock issuance.',document:JSON.stringify({kind:'DEPOSIT',sender:'Test bank',date:'2027-01-11',total:20000,reference:'DEP-1001'})}],entries:[],lines:[],trial:[],drafts:[]};
let calls:{url:string;options:any}[]=[];
beforeEach(()=>{calls=[];vi.stubGlobal('fetch',vi.fn(async(url:string,options:any)=>{calls.push({url,options});return {ok:true,json:async()=>url.includes('config')?{local:true}:url.includes('/check')?{correct:true,feedback:'Ready to post.'}:structuredClone(state)};}));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe('student manual workspace',()=>{
 it('requires a student to enter their own date and accounts, and sends exact cents for checking',async()=>{
  render(<App/>);await screen.findByText('Welcome back, Jamie.');
  fireEvent.click(screen.getByRole('button',{name:'Open workspace'}));
  expect((screen.getByLabelText('Transaction date') as HTMLInputElement).value).toBe('');
  expect((screen.getByLabelText('Account line 1') as unknown as HTMLSelectElement).value).toBe('');
  fireEvent.change(screen.getByLabelText('Transaction date'),{target:{value:'2027-01-11'}});
  fireEvent.change(screen.getByLabelText('Memo'),{target:{value:'Issued stock'}});
  fireEvent.change(screen.getByLabelText('Account line 1'),{target:{value:'1010'}});
  fireEvent.change(screen.getByLabelText('debit line 1'),{target:{value:'0.29'}});
  fireEvent.change(screen.getByLabelText('Account line 2'),{target:{value:'3010'}});
  fireEvent.change(screen.getByLabelText('credit line 2'),{target:{value:'0.29'}});
  fireEvent.click(screen.getByRole('button',{name:'Check entry'}));
  await screen.findByText('Ready to post.');
  const check=calls.find(c=>c.url.endsWith('/check'));expect(JSON.parse(check!.options.body).lines).toEqual([{account:'1010',debit:29,credit:0},{account:'3010',debit:0,credit:29}]);expect(calls.some(c=>c.url.endsWith('/post'))).toBe(false);
 });
 it('keeps manually entered work when switching document/entry tabs and adding compound lines',async()=>{
  render(<App/>);await screen.findByText('Welcome back, Jamie.');fireEvent.click(screen.getByRole('button',{name:'Open workspace'}));
  fireEvent.change(screen.getByLabelText('Memo'),{target:{value:'Work in progress'}});
  fireEvent.click(screen.getByRole('button',{name:'Journal entry'}));fireEvent.click(screen.getByRole('button',{name:'Business document'}));
  expect((screen.getByLabelText('Memo') as HTMLInputElement).value).toBe('Work in progress');
  fireEvent.click(screen.getByRole('button',{name:'Add line'}));expect(screen.getByLabelText('Account line 3')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Save draft'}));await waitFor(()=>expect(calls.some(c=>c.url.endsWith('/draft'))).toBe(true));
 });
});

describe('instructor student management',()=>{
 it('creates an enrolled student, shows the generated passphrase, and allows dismissing it',async()=>{
  let student:any=null;
  vi.stubGlobal('fetch',vi.fn(async(url:string,options:any)=>{
   calls.push({url,options});
   const instructorState={...structuredClone(state),user:{id:'i',name:'Carter Godwin',role:'owner'},section:{id:'acg201',name:'ACG 201',weight:5}};
   if(url.includes('/students?')){const body=JSON.parse(options.body);student={id:'new-student',name:body.name,email:body.email};return {ok:true,json:async()=>({student,passphrase:'generated-test-passphrase',section:{id:'acg201',name:'ACG 201'}})};}
   return {ok:true,json:async()=>url.includes('/config')?{local:true}:url.includes('/instructor')?{students:student?[student]:[],submissions:[],attempts:[]}:instructorState};
  }));
  render(<App/>);await screen.findByText('Welcome back, Carter.');
  fireEvent.click(screen.getByRole('button',{name:'Students'}));
  fireEvent.change(screen.getByLabelText('Student name'),{target:{value:'Test Student'}});
  fireEvent.change(screen.getByLabelText('Student email'),{target:{value:'test@example.test'}});
  fireEvent.click(screen.getByRole('button',{name:'Create student account'}));
  await screen.findByText('generated-test-passphrase');
  const call=calls.find(c=>c.url.includes('/students?'));expect(call!.url).toBe('/api/students?section=acg201');expect(JSON.parse(call!.options.body)).toEqual({name:'Test Student',email:'test@example.test'});
  fireEvent.click(screen.getByRole('button',{name:'Dismiss login details'}));
  expect(screen.queryByText('generated-test-passphrase')).toBeNull();
  expect((screen.getByLabelText('Student name') as HTMLInputElement).value).toBe('');
 });
});
