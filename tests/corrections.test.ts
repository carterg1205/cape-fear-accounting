import {describe,it,expect} from 'vitest';
import {correctionTime} from '../worker/book-corrections';
import {businessText} from '../src/business-format';
describe('correction schedule and business formatting',()=>{
 it('schedules from the effective deadline, including timezone offsets and day boundaries',()=>{expect(correctionTime('2027-01-15T23:55:00-05:00',24)).toBe('2027-01-17T04:55:00.000Z');expect(correctionTime('2027-01-15T23:55:00-05:00',0)).toBe('2027-01-16T04:55:00.000Z');expect(correctionTime(null,24)).toBeNull();expect(correctionTime('bad',24)).toBeNull();});
 it('formats stored and generated narrative amounts consistently',()=>{expect(businessText('Deposit $20000.00 and fee $12.50.')).toBe('Deposit $20,000 and fee $12.50.');expect(businessText('Investment $20,000 and cash change $-1250.25.')).toBe('Investment $20,000 and cash change -$1,250.25.');});
});
