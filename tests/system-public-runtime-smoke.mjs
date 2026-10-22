/** Public Next/Nest checks requiring no accounts, DB writes or E2E opt-in.
 * This does NOT verify PostgreSQL readiness or authenticated persistence.
 * Run with both built servers started: node tests/system-public-runtime-smoke.mjs
 */
import assert from 'node:assert/strict';
import {localE2EFetch,localTestOrigin} from '../infrastructure/scripts/e2e-http.mjs';
import {getReadOnlyRouteManifest} from '../infrastructure/scripts/read-only-route-manifest.mjs';
const base=localTestOrigin(process.env.NEXT_BASE_URL||'http://127.0.0.1:3000');
const origin=localTestOrigin(process.env.WEB_ORIGIN||'http://localhost:3000');
const routes=[...getReadOnlyRouteManifest(),...['/mai-hoa','/luc-hao','/ky-mon','/phong-thuy','/study','/collection','/research','/research/examples','/research/schools','/iching','/huyen-hoc','/ngu-hanh'].map(path=>({path,marker:'THIÊN ĐỒ'}))];
for(const route of routes){
 const res=await localE2EFetch(base,route.path);
 assert.equal(res.status,200,route.path);assert.match(res.headers.get('content-type'),/text\/html/);
 assert.ok((await res.text()).includes(route.marker),route.path);console.log(`PASS ${route.path}`);
}
for(const path of ['/api/health','/api/auth/me','/api/auth/google/config']){
 const res=await localE2EFetch(base,path);assert.equal(res.status,200,path);
 const body=await res.json();assert.equal(typeof body,'object');
 if(path.endsWith('/me'))assert.equal(body.user,null);
 console.log(`PASS proxy ${path}`);
}
for(const path of ['/api/study','/api/charts']){
 const res=await localE2EFetch(base,path);assert.equal(res.status,401);console.log(`PASS guest isolation ${path}`);
}
const input={date:'2004-01-01',hour:8,minute:30,calendar:'solar',leap:false,gender:'Nam'};
const calculate=await localE2EFetch(base,'/api/charts/calculate',{method:'POST',headers:{'Content-Type':'application/json',origin},body:JSON.stringify(input)});
assert.equal(calculate.status,200);assert.equal((await calculate.json()).result.houses.length,12);
const csrf=await localE2EFetch(base,'/api/charts/calculate',{method:'POST',headers:{'Content-Type':'application/json',origin:'https://untrusted.example.invalid'},body:JSON.stringify(input)});
assert.equal(csrf.status,403);
console.log(`PASS ${routes.length} public routes, 3 proxy endpoints, guest isolation, calculation and origin rejection. No authenticated or PostgreSQL E2E claim.`);
