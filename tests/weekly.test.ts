import {describe,it,expect,vi,afterEach} from 'vitest';
import {weeklyUnits,currentWeek,firstUnitActivity} from '../src/weekly';
afterEach(()=>vi.useRealTimers());
describe('weekly units',()=>{
 it('groups steps into units and fills progress only for submitted work',()=>{const units=weeklyUnits([{unit:1,points:10,entry_id:'a',unlocked:true},{unit:1,points:10,entry_id:null,unlocked:true},{unit:2,points:20,entry_id:null,unlocked:false}]);expect(units).toHaveLength(2);expect(units[0]).toMatchObject({total:2,completed:1,percent:50,points:20,complete:false});expect(firstUnitActivity(units[0])).toBe(units[0].activities[1]);expect(weeklyUnits(units[0].activities.map(a=>({...a,entry_id:'done'})))[0]).toMatchObject({percent:100,complete:true});});
 it('selects the nearest open deadline and respects extensions, scheduled units and late work',()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2027-03-01'));const units=weeklyUnits([{unit:1,points:10,unlocked:true,due_at:'2027-02-28'},{unit:2,points:10,unlocked:true,due_at:'2027-02-28',effective_due_at:'2027-03-05'},{unit:3,points:10,unlocked:false,opens_at:'2027-03-06'},{unit:4,points:10,unlocked:true,due_at:'2027-03-07'}]);expect(units[0].available).toBe(false);expect(units[1].available).toBe(true);expect(units[2].available).toBe(false);expect(currentWeek(units)?.unit).toBe(2);});
});
