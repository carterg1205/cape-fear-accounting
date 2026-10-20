// @vitest-environment jsdom
import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {App} from '../src/main';
const state={user:{id:'s',name:'Jamie Parker',role:'student'},section:{name:'ACG 201',weight:5},sections:[],accounts:[{id:'1010',name:'Cash'},{id:'3010',name:'Common stock'}],assignments:[{id:'capital',title:'A new beginning',unit:1,points:10,unlocked:true,attempts:0,instructions:'Record the stock issuance.',document:JSON.stringify({kind:'DEPOSIT',sender:'Test bank',date:'2027-01-11',total:20000,reference:'DEP-1001'})}],entries:[],lines:[],trial:[],drafts:[]};
let calls:{url:string;options:any}[]=[];
beforeEach(()=>{window.history.replaceState(null,'','/');sessionStorage.clear();calls=[];vi.stubGlobal('fetch',vi.fn(async(url:string,options:any)=>{calls.push({url,options});return {ok:true,json:async()=>url.includes('config')?{local:true}:url.includes('/check')?{correct:true,feedback:'Ready to post.'}:structuredClone(state)};}));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe('student manual workspace',()=>{
 it('requires a student to enter their own date and accounts, and sends exact cents for checking',async()=>{
  render(<App/>);await screen.findByText('Welcome back, Jamie.');
  fireEvent.click(screen.getByRole('button',{name:'Start this week’s unit'}));
  expect((screen.getByLabelText('Transaction date') as HTMLInputElement).value).toBe('');
  expect((screen.getByLabelText('Account line 1') as unknown as HTMLSelectElement).value).toBe('');
  fireEvent.change(screen.getByLabelText('Transaction date'),{target:{value:'2027-01-11'}});
  fireEvent.change(screen.getByLabelText('Memo'),{target:{value:'Issued stock'}});
  fireEvent.change(screen.getByLabelText('Account line 1'),{target:{value:'1010'}});fireEvent.keyDown(screen.getByLabelText('Account line 1'),{key:'Enter'});
  fireEvent.change(screen.getByLabelText('debit line 1'),{target:{value:'0.29'}});
  fireEvent.change(screen.getByLabelText('Account line 2'),{target:{value:'3010'}});fireEvent.keyDown(screen.getByLabelText('Account line 2'),{key:'Enter'});
  fireEvent.change(screen.getByLabelText('credit line 2'),{target:{value:'0.29'}});
  fireEvent.click(screen.getByRole('button',{name:'Check entry'}));
  await screen.findByText('Ready to post.');
  const check=calls.find(c=>c.url.endsWith('/check'));expect(JSON.parse(check!.options.body).lines).toEqual([{account:'1010',debit:29,credit:0},{account:'3010',debit:0,credit:29}]);expect(calls.some(c=>c.url.endsWith('/post'))).toBe(false);
 });
 it('keeps manually entered work when switching document/entry tabs and adding compound lines',async()=>{
  render(<App/>);await screen.findByText('Welcome back, Jamie.');fireEvent.click(screen.getByRole('button',{name:'Start this week’s unit'}));
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

describe('wrong-entry feedback',()=>{
 it('uses yellow review styling and words when the entry is wrong',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:true,json:async()=>url.includes('config')?{local:true}:url.includes('/check')?{correct:false,feedback:'The reference number must match the source document exactly.'}:structuredClone(state)})));
  render(<App/>);await screen.findByText('Welcome back, Jamie.');fireEvent.click(screen.getByRole('button',{name:'Start this week’s unit'}));fireEvent.click(screen.getByRole('button',{name:'Check entry'}));
  const alert=await screen.findByRole('alert');expect(alert.classList.contains('warning')).toBe(true);expect(alert.textContent).toContain('Needs review.');expect(alert.textContent).toContain('reference number');expect(alert.classList.contains('notice')).toBe(false);
 });
});

describe('course-aligned assignment authoring',()=>{
 it('saves an unpublished draft with exact cents and preserves the selected course unit',async()=>{
  const {AssignmentBuilder}=await import('../src/AssignmentBuilder');
  const call=vi.fn(async(path:string,data?:any)=>path==='assignments/save'?{id:'new-assignment'}:{assignment:{...data},accepted:[],documents:[],frozen:false});
  const onSaved=vi.fn(async()=>{});
  render(<AssignmentBuilder accounts={state.accounts} section={{id:'acg201',name:'ACG 201'}} sections={[{id:'acg201',name:'ACG 201'}]} editId="" initialUnit={7} call={call} onSaved={onSaved} onPreview={()=>{}}/>);
  expect((screen.getByLabelText('Course unit') as unknown as HTMLSelectElement).value).toBe('7');
  expect(screen.getByText(/Provide the bad-debt expense amount/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Assignment title'),{target:{value:'A receivable exercise'}});
  fireEvent.change(screen.getByLabelText('Required document reference'),{target:{value:'AR-301'}});
  fireEvent.change(screen.getByLabelText('Document total ($)'),{target:{value:'12.29'}});
  fireEvent.click(screen.getByRole('button',{name:'Save as draft'}));
  await waitFor(()=>expect(onSaved).toHaveBeenCalledOnce());
  const args=call.mock.calls.find(c=>c[0]==='assignments/save')![1];expect(args.published).toBe(false);expect(args.document.totalCents).toBe(1229);expect(args.unit).toBe(7);expect(args.reference).toBe('AR-301');
 });
});

describe('refresh and accounting workspace',()=>{
 it('shows a loading workspace while checking the session, with no login flash',async()=>{
  let resolveState!:(value:any)=>void;
  vi.stubGlobal('fetch',vi.fn((url:string)=>url.includes('/state')?new Promise(resolve=>{resolveState=resolve;}):Promise.resolve({ok:true,json:async()=>({local:true})})));
  render(<App/>);
  expect(screen.getByRole('status').textContent).toContain('Opening accounting workspace');
  expect(screen.queryByRole('button',{name:'Sign in'})).toBeNull();
  resolveState({ok:true,json:async()=>structuredClone(state)});
  await screen.findByText('Welcome back, Jamie.');
  expect(screen.queryByRole('button',{name:'Sign in'})).toBeNull();
 });
 it('restores the selected journal and locally entered work after a refresh',async()=>{
  window.history.replaceState(null,'','/#page=Journal&assignment=capital');
  sessionStorage.setItem('cfo-draft:s:undefined:capital',JSON.stringify({date:'2027-01-11',memo:'Unsaved work',reference:'DEP-1001',lines:[{account:'1010',debit:'20000',credit:''},{account:'3010',debit:'',credit:'20000'}]}));
  render(<App/>);
  await screen.findByLabelText('Memo');
  expect((screen.getByLabelText('Memo') as HTMLInputElement).value).toBe('Unsaved work');
  expect((screen.getByLabelText('debit line 1') as HTMLInputElement).value).toBe('20000');
  expect(screen.queryByText('Welcome back, Jamie.')).toBeNull();
  expect(window.location.hash).toContain('page=Journal');
 });
 it('hides edition controls and teaching banners from the student workspace',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:true,json:async()=>url.includes('config')?{local:true}:{...structuredClone(state),versions:[{id:'v',name:'Edition'}],viewVersion:'v',unit:1}})));
  render(<App/>);await screen.findByText('Welcome back, Jamie.');
  expect(screen.queryByLabelText('Course edition')).toBeNull();expect(screen.queryByText('Learn by doing.')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Start this week’s unit'}));
  expect(screen.queryByText('Review the concepts and worked example')).toBeNull();
  expect(screen.getByLabelText('Account line 1').getAttribute('role')).toBe('combobox');
  expect((screen.getByLabelText('debit line 1') as HTMLInputElement).value).toBe('');
 });
 it('shows a recoverable load error instead of a login form on network failure',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>{if(url.includes('/state'))throw Error('Network unavailable');return {ok:true,json:async()=>({local:true})};}));
  render(<App/>);await screen.findByText('Network unavailable');expect(screen.queryByRole('button',{name:'Sign in'})).toBeNull();expect(screen.getByRole('button',{name:'Try again'})).toBeTruthy();
 });
});

describe('class switching',()=>{
 it('waits for the selected class before allowing a weekly unit to open',async()=>{
  const first={...structuredClone(state),section:{id:'first',name:'First class',weight:5},sections:[{id:'first',name:'First class'},{id:'second',name:'Second class'}]},second={...first,section:{id:'second',name:'Second class',weight:5},assignments:[{...structuredClone(state.assignments[0]),id:'second-task',unit:2,title:'Second class task'}]};
  let finish:(value:any)=>void=()=>{};const pending=new Promise(resolve=>{finish=resolve;});
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:true,json:async()=>url.includes('config')?{}:url.includes('section=second')?pending:structuredClone(first)})));
  render(<App/>);await screen.findByText('Welcome back, Jamie.');
  fireEvent.change(screen.getByLabelText('Current class'),{target:{value:'second'}});
  await waitFor(()=>expect((screen.getByRole('button',{name:'Start this week’s unit'}) as HTMLButtonElement).disabled).toBe(true));
  finish(second);
  await waitFor(()=>expect((screen.getByRole('button',{name:'Start this week’s unit'}) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button',{name:'Start this week’s unit'}));
  expect(screen.getByRole('button',{name:'Step 1: Second class task'})).toBeTruthy();
  await waitFor(()=>expect(window.location.hash).toContain('section=second'));
  expect(screen.getByRole('button',{name:'Step 1: Second class task'})).toBeTruthy();
 });
});
