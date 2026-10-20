import {describe,it,expect} from 'vitest';
import {unitPrerequisites} from '../worker/unit-access';
describe('unit prerequisites',()=>{
 it('requires every prior published assignment to be submitted, while preserving review of the first unit',()=>{const result=unitPrerequisites([{unit:1,completed:true},{unit:1,completed:false},{unit:2,completed:true},{unit:3,completed:false}]);expect(result.blocked[1]).toBeUndefined();expect(result.blocked[2]).toBe(1);expect(result.blocked[3]).toBe(1);});
 it('unlocks the next unit immediately after completion and then requires that next unit',()=>{const result=unitPrerequisites([{unit:1,completed:true},{unit:2,completed:false},{unit:3,completed:false}]);expect(result.blocked[2]).toBeUndefined();expect(result.blocked[3]).toBe(2);});
 it('waives a prior prerequisite without waiving later work and tolerates omitted or empty units',()=>{const rows=[{unit:1,completed:false},{unit:3,completed:false},{unit:4,completed:false}];expect(unitPrerequisites(rows,[1]).blocked[3]).toBeUndefined();expect(unitPrerequisites(rows,[1]).blocked[4]).toBe(3);expect(unitPrerequisites([],[]).blocked).toEqual({});expect(unitPrerequisites(rows,[1,3]).blocked[4]).toBeUndefined();});
});
