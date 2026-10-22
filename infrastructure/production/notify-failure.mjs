// Operator-configured webhook only. Never forwards application logs or user data.
const url=process.env.ALERT_WEBHOOK_URL;
if(!url)throw Error('Configure an alert recipient webhook before enabling notifications');
const parsed=new URL(url);
if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw Error('Alert webhook must use HTTPS without embedded credentials');
const unit=process.argv[2]||'unknown';
if(!/^[a-zA-Z0-9@_.-]{1,160}$/.test(unit))throw Error('Invalid service identifier');
const r=await fetch(parsed,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'content-type':'application/json'},body:JSON.stringify({event:'thien_do_operation_failed',unit,at:new Date().toISOString()})});
if(!r.ok)throw Error('Alert delivery failed');
console.log(JSON.stringify({event:'alert_delivered',unit}));
