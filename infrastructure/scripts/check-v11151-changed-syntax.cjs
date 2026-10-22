const fs=require('fs'),path=require('path'),ts=require('typescript');
const root=path.resolve(__dirname,'../..');
const files=[
'apps/api/src/app.module.ts','apps/api/src/modules/auth/auth.controller.ts','apps/api/src/modules/auth/auth.service.ts','apps/api/src/modules/auth/account-email.service.ts','apps/api/src/modules/auth/admin-mfa.service.ts','apps/api/src/modules/auth/totp.ts','apps/api/src/modules/auth/email-code.ts','apps/api/src/modules/auth/google-auth.service.ts','apps/api/src/modules/billing/admin.service.ts',
'apps/web/src/app/admin/page.tsx','apps/web/src/components/account-security-extras.tsx','apps/web/src/components/account-settings.tsx','apps/web/src/features/membership/admin-mfa-gate.tsx'];
let failures=0;
for(const file of files){const source=fs.readFileSync(path.join(root,file),'utf8');const result=ts.transpileModule(source,{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,experimentalDecorators:true,emitDecoratorMetadata:true}});
 const diagnostics=(result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
 if(diagnostics.length){failures++;console.error('FAIL',file,diagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('; '));}else console.log('PASS',file);
}
if(failures)process.exitCode=1;
