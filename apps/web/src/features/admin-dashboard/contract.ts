import {adminObject,adminString,adminInteger,adminList,invalidAdminResponse} from '@/features/admin/response-contract';
function nullableInteger(value:unknown) {return value===null?null:adminInteger(value);}
function date(value:unknown) {const s=adminString(value);if(!Number.isFinite(Date.parse(s))) invalidAdminResponse();return s;}
export function dashboardReport(raw:unknown) {
  const r=adminObject(raw);
  if(r.timeZone!=='Asia/Ho_Chi_Minh'||![1,7,30].includes(adminInteger(r.days))) invalidAdminResponse();
  const metrics=adminList(r.metrics,item=>{const m=adminObject(item);if(!['snapshot','period'].includes(String(m.scope))) invalidAdminResponse();return {id:adminString(m.id),label:adminString(m.label),value:nullableInteger(m.value),previous:nullableInteger(m.previous),unit:adminString(m.unit),source:adminString(m.source),scope:adminString(m.scope),href:typeof m.href==='string'&&/^\/admin(?:\/|$)/.test(m.href)?m.href:undefined};});
  if(metrics.length>20||new Set(metrics.map(m=>m.id)).size!==metrics.length) invalidAdminResponse();
  const daily=adminList(r.daily,item=>{const d=adminObject(item);return {date:date(d.date),registrations:nullableInteger(d.registrations),posts:nullableInteger(d.posts),views:nullableInteger(d.views)};});
  if(daily.length>31) invalidAdminResponse();
  const orders=adminList(r.orders,item=>{const o=adminObject(item);if(!['creating','pending','paid','failed','cancelled','refunded'].includes(String(o.status))) invalidAdminResponse();return {status:adminString(o.status),count:adminInteger(o.count)};});
  return {metrics,daily,orders,restricted:r.restricted===undefined?[]:adminList(r.restricted,adminString),warnings:adminList(r.warnings,adminString),start:date(r.start),end:date(r.end),generatedAt:date(r.generatedAt)};
}
export type DashboardReport=ReturnType<typeof dashboardReport>;
