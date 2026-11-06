import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzeAccountMigrationLedger as check} from '../infrastructure/scripts/lib/registration-readiness.mjs';
const expected=Array.from({length:37},(_,i)=>String(i+1).padStart(3,'0')+'_fixture.sql');
test('current 37-migration account diagnostic accepts the complete ledger',()=>assert.equal(check(expected,expected).ok,true));
test('missing migration 037 is reported',()=>assert.deepEqual(check(expected,expected.slice(0,36)).missing,[expected[36]]));
test('same count with substituted migration fails',()=>assert.equal(check(expected,[...expected.slice(0,36),'999_unknown.sql']).ok,false));
test('duplicate ledger rows fail',()=>assert.equal(check(expected,[...expected,expected[0]]).ok,false));
