'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const root=resolve(__dirname,'..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const gate=read('apps/web/src/components/tool-access-gate.tsx');
const admin=read('apps/web/src/features/membership/admin-session.tsx');
const css=read('apps/web/src/components/account-settings.css');
const shell=read('apps/web/src/components/shell.tsx');
const {requiresToolLogin,safeToolReturn}=require('../apps/web/src/lib/tool-access.cjs');

test('Admin path shows AdminSession prompt instead of a redirect to generic tool login',()=>{
  assert.match(gate,/const adminRoute=pathname==='\/admin'\|\|pathname\.startsWith\('\/admin\/'\)/);
  assert.match(gate,/const protectedRoute=requiresToolLogin\(pathname\)&&!adminRoute/);
  assert.match(shell,/<ToolAccessGate>\{children\}<\/ToolAccessGate>/);
  assert.match(admin,/Đăng nhập quản trị/);
  assert.match(admin,/<VerifiedSession key=\{user\.id\}>/);
  assert.match(admin,/\/api\/billing\/access/);
  assert.match(admin,/\/api\/auth\/mfa\/status/);
  assert.match(admin,/!mfa\.verified/);
  assert.equal(requiresToolLogin('/admin'),true);
  assert.equal(requiresToolLogin('/admin/finance'),true);
  assert.equal(safeToolReturn('/admin?tab=finance'),'/admin?tab=finance');
});

test('Other private routes still need a valid session',()=>{
  for(const route of ['/chart','/bazi','/study','/membership','/tarot','/forum/me']){
    assert.equal(requiresToolLogin(route),true,route);
  }
  assert.match(gate,/router\.replace\('\/login\?next='/);
});

test('Signed-in account gets a height-bounded desktop scroller and a phone/tablet scroller',()=>{
  assert.match(css,/@media \(min-width: 861px\)/);
  assert.match(css,/\.modal\.account-modal\.thien-mon-branded\.account-modal-signed-in\s*\{\s*height: min\(90dvh, 900px\)/);
  assert.match(css,/grid-template-rows: minmax\(0, 1fr\)/);
  assert.match(css,/\.account-dialog-content\s*\{\s*min-height: 0;\s*max-height: 100%;\s*overflow-x: hidden;\s*overflow-y: auto/);
  assert.match(css,/@media \(max-width: 860px\)/);
  assert.match(css,/\.modal\.account-modal\.thien-mon-branded\.account-modal-signed-in\s*\{\s*height: auto;/);
  assert.match(css,/max-height: min\(92dvh, 900px\);\s*overflow-x: hidden;\s*overflow-y: auto/);
  assert.match(css,/\.account-dialog-content\s*\{\s*max-height: none;\s*overflow: visible/);
});
