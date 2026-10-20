// @vitest-environment jsdom
import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {StatementWorkspace} from '../src/StatementWorkspace';
import {compileCourse} from '../worker/course-engine';
afterEach(cleanup);
it('leaves statement answers blank, supports labeled dropdowns and highlights the specific wrong row',async()=>{
 const a=compileCourse({},2).activities.find(a=>a.key==='u1is')!,call=vi.fn(async(_path:string,_body:any)=>({correct:false,feedback:'Row 1: review the amount.',issues:[{path:'rows.0.amount',message:'Review the amount.'}]}));
 render(<StatementWorkspace assignment={{id:'statement',course_revision:1,activity_data:JSON.stringify(a.activity)}} call={call} onSaved={vi.fn()}/>);
 expect((screen.getByLabelText('Company name') as HTMLInputElement).value).toBe('');expect((screen.getByLabelText('Amount ($) 1') as HTMLInputElement).value).toBe('');
 fireEvent.change(screen.getByLabelText('Statement title'),{target:{value:'Income statement'}});fireEvent.change(screen.getByLabelText('Date heading'),{target:{value:'period'}});fireEvent.change(screen.getByLabelText('Section 1'),{target:{value:'Revenues'}});fireEvent.change(screen.getByLabelText('Amount ($) 1'),{target:{value:'12.34'}});
 fireEvent.click(screen.getByRole('button',{name:'Check statement'}));await screen.findByRole('alert');expect(screen.getByLabelText('Amount ($) 1').getAttribute('aria-invalid')).toBe('true');expect(call.mock.calls[0][1].statement.rows[0].amount).toBe('12.34');expect(call.mock.calls[0][0]).toContain('/check');
});
