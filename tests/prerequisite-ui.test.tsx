// @vitest-environment jsdom
import React from 'react';
import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {WeeklyAssignments,WeeklyDashboard} from '../src/WeeklyWorkspace';
afterEach(cleanup);
const assignments=[{id:'a',unit:1,points:10,unlocked:true,released:true},{id:'b',unit:2,points:10,unlocked:false,released:true,prerequisite_unit:1,due_at:'2030-01-07T00:00:00Z'}];
it('keeps the released next unit and its due date visible with a completion lock',()=>{const choose=vi.fn();const {rerender}=render(<WeeklyAssignments assignments={assignments} onChoose={choose}/>);const locked=screen.getByRole('button',{name:'Complete Unit 1 to begin'}) as HTMLButtonElement;expect(locked.disabled).toBe(true);expect(screen.getByText(/Next deadline:/)).toBeTruthy();fireEvent.click(locked);expect(choose).not.toHaveBeenCalled();rerender(<WeeklyAssignments assignments={[{...assignments[0],entry_id:'done'},{...assignments[1],unlocked:true,prerequisite_unit:null}]} onChoose={choose}/>);fireEvent.click(screen.getByRole('button',{name:'Start unit'}));expect(choose).toHaveBeenCalledWith(expect.objectContaining({id:'b'}));});
it('explains the same requirement on the dashboard upcoming list',()=>{render(<WeeklyDashboard assignments={assignments} onChoose={vi.fn()}/>);expect(screen.getByText(/Complete Unit 1 to begin/)).toBeTruthy();});
