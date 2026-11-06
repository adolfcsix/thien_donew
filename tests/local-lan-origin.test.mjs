import {test} from 'node:test';import assert from 'node:assert/strict';
import {localLanOrigin,privateIPv4,localLanEnvironment} from '../infrastructure/scripts/lib/local-lan-origin.mjs';
const entry=address=>({address,internal:false});
test('single LAN adapter yields the explicit browser origin',()=>assert.equal(localLanOrigin(undefined,{wifi:[entry('192.168.1.242')]}),'http://192.168.1.242:3000'));
test('multiple adapters require deliberate selection',()=>{const n={wifi:[entry('192.168.1.242')],vpn:[entry('10.0.0.5')]};assert.throws(()=>localLanOrigin(undefined,n));assert.equal(localLanOrigin('192.168.1.242',n),'http://192.168.1.242:3000')});
test('public, loopback, foreign interface and injected values rejected',()=>{for(const ip of ['127.0.0.1','8.8.8.8','192.168.1.5','192.168.1.242;echo bad','::1'])assert.throws(()=>localLanOrigin(ip,{wifi:[entry('192.168.1.242')]}));assert.equal(privateIPv4('172.32.0.1'),false)});

test('clean source check defers only the known browser TOTP output with source proof',async()=>{const {deferredSqlTestSource:f}=await import('../infrastructure/scripts/source-import-policy.mjs');assert.equal(f('tests/helpers-lifetime-pro-browser.cjs','../apps/api/dist/modules/auth/totp.js'),'apps/api/src/modules/auth/totp.ts');assert.equal(f('tests/helpers-other.cjs','../apps/api/dist/modules/auth/totp.js'),null);assert.equal(f('tests/helpers-lifetime-pro-browser.cjs','../apps/api/dist/modules/auth/missing.js'),null)});

test('LAN launch preserves config and pins browser/API origin without modifying source environment',()=>{const env={WEB_ORIGIN:'http://localhost:3000',API_HOST:'127.0.0.1',COOKIE_SECURE:'false'};const next=localLanEnvironment('192.168.1.242',{wifi:[entry('192.168.1.242')]},env);assert.equal(next.WEB_ORIGIN,'http://192.168.1.242:3000');assert.equal(next.API_HOST,'127.0.0.1');assert.equal(env.WEB_ORIGIN,'http://localhost:3000');});
test('LAN HTTP launcher refuses production and Secure-cookie configuration',()=>{for(const env of [{NODE_ENV:'production'},{COOKIE_SECURE:'true'}])assert.throws(()=>localLanEnvironment('192.168.1.242',{wifi:[entry('192.168.1.242')]},env));});
