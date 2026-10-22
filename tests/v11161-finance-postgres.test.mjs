/** V11.161 database regression; STRICTLY disposable CI localhost. */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
const url=process.env.DATABASE_URL;
if(process.env.CI!=='true'||process.env.E2E_LOCAL_DB_CONFIRM!=='YES'||!/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):5432\/thiendo_test$/.test(url||'')){
 throw Error('BLOCKED: finance regression requires disposable localhost thiendo_test database and explicit CI authorization');
}
const db=new pg.Client({connectionString:url,connectionTimeoutMillis:7000});
await db.connect();
try{await db.query('BEGIN');try{
 const migr=await db.query("SELECT name FROM schema_migrations WHERE name='028_billing_reconciliation_policy.sql'");assert.equal(migr.rowCount,1,'V11.161 migration not installed');
 const plans=await db.query("SELECT id,enabled FROM billing_plans WHERE id IN ('pro90','pro365') ORDER BY id");assert.deepEqual(plans.rows.map(x=>x.enabled),[false,false]);
 const free=await db.query('SELECT free_daily,pro_daily FROM ai_plan_quotas WHERE id=1');assert.equal(free.rowCount,1);assert.ok(free.rows[0].pro_daily>=free.rows[0].free_daily);
 const qr=await db.query('SELECT enabled FROM billing_bank_config WHERE id=1');assert.equal(qr.rows[0].enabled,false,'Never expose arbitrary bank account by default');
 await db.query('SAVEPOINT qr_invalid');await assert.rejects(db.query("UPDATE billing_bank_config SET enabled=TRUE WHERE id=1"),/check constraint/i);await db.query('ROLLBACK TO SAVEPOINT qr_invalid');
 const [customer,adminA,adminB]=[randomUUID(),randomUUID(),randomUUID()];
 for(const id of [customer,adminA,adminB])await db.query('INSERT INTO users(id,email,password_hash,salt) VALUES($1,$2,$3,$4)',[id,`finance161-${id}@example.invalid`,'CI only','CI only']);
 const orderId=randomUUID();await db.query(`INSERT INTO billing_orders(id,user_id,plan_id,plan_name,amount_vnd,days,features,status,request_key,expires_at,paid_at) VALUES($1,$2,'pro30','CI Pro',50000,30,'["premium-report"]','paid',$3,clock_timestamp()+INTERVAL '20 minutes',clock_timestamp())`,[orderId,customer,randomUUID()]);
 await db.query('INSERT INTO billing_refund_requests(order_id,reason,requester_id) VALUES($1,$2,$3)',[orderId,'Khách hàng đã được duyệt hoàn tiền',adminA]);
 await db.query('SAVEPOINT self_approval');await assert.rejects(db.query("UPDATE billing_refund_requests SET status='approved',approver_id=$1,approved_at=clock_timestamp() WHERE order_id=$2",[adminA,orderId]),/check constraint/i);await db.query('ROLLBACK TO SAVEPOINT self_approval');
 await db.query('SAVEPOINT no_approval');await assert.rejects(db.query("UPDATE billing_refund_requests SET status='completed',refund_reference='BANK_REFUND_12345',completed_at=clock_timestamp() WHERE order_id=$1",[orderId]),/check constraint/i);await db.query('ROLLBACK TO SAVEPOINT no_approval');
 await db.query("UPDATE billing_refund_requests SET status='approved',approver_id=$1,approved_at=clock_timestamp() WHERE order_id=$2",[adminB,orderId]);
 await db.query("UPDATE billing_refund_requests SET status='completed',refund_reference='BANK_REFUND_12345',completed_by=$1,completed_at=clock_timestamp() WHERE order_id=$2",[adminA,orderId]);
 assert.equal((await db.query('SELECT status FROM billing_refund_requests WHERE order_id=$1',[orderId])).rows[0].status,'completed');
 await db.query('SAVEPOINT duplicated');const otherId=randomUUID();await db.query(`INSERT INTO billing_orders(id,user_id,plan_id,plan_name,amount_vnd,days,features,status,request_key,expires_at) VALUES($1,$2,'pro30','CI Pro',50000,30,'["premium-report"]','paid',$3,clock_timestamp()+INTERVAL '20 minutes')`,[otherId,customer,randomUUID()]);
 await assert.rejects(db.query("INSERT INTO billing_refund_requests(order_id,status,reason,requester_id,approver_id,approved_at,completed_at,refund_reference) VALUES($1,'completed','Hoàn tiền trùng mã thanh toán',$2,$3,clock_timestamp(),clock_timestamp(),'BANK_REFUND_12345')",[otherId,adminA,adminB]),/unique/i);await db.query('ROLLBACK TO SAVEPOINT duplicated');
 await db.query('DELETE FROM users WHERE id=$1',[customer]);assert.equal((await db.query('SELECT * FROM billing_refund_requests WHERE order_id=$1',[orderId])).rowCount,0,'Customer deletion must not be blocked by refund FK');
 console.log('PASS V11.161: 28 migrations, safe bank default, refund dual-approval, no duplicate reference, account cleanup');
}finally{await db.query('ROLLBACK');}}finally{await db.end();}
