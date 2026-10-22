import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ACCOUNT_COLUMNS,ACCOUNT_MIGRATIONS,analyzeRegistrationSchema} from '../infrastructure/scripts/lib/registration-readiness.mjs';
const validColumns=Object.entries(ACCOUNT_COLUMNS).flatMap(([table_name,cols])=>cols.map(column_name=>({table_name,column_name})));
test('registration schema diagnostic accepts exact required migrations and columns',()=>{
 assert.deepEqual(analyzeRegistrationSchema(ACCOUNT_MIGRATIONS,validColumns),{ok:true,missingMigrations:[],missingColumns:[]});
});
test('registration diagnostic identifies missing 019 migration and missing sessions.device_label',()=>{
 const sample=analyzeRegistrationSchema(ACCOUNT_MIGRATIONS.filter(x=>!x.startsWith('019_')), validColumns.filter(x=>x.column_name!=='device_label'));
 assert.equal(sample.ok,false);assert.deepEqual(sample.missingMigrations,['019_account_admin_mfa.sql']);
 assert.deepEqual(sample.missingColumns,['sessions.device_label']);
});
test('registration diagnostic identifies absent audit table rather than guessing email/password issue',()=>{
 const sample=analyzeRegistrationSchema(ACCOUNT_MIGRATIONS,validColumns.filter(x=>x.table_name!=='account_security_events'));
 assert.equal(sample.ok,false);assert.deepEqual(sample.missingColumns,['account_security_events.user_id','account_security_events.event']);
});
