"""Preview derived from V11.1 and the SAME TS route functions used by the app.
Does not claim to run Next.js/NestJS; only a browser interaction fixture.
"""
from pathlib import Path
import subprocess, json
root=Path(__file__).resolve().parents[2]
html=(root/'previews/v11-fluid-relations-preview.html').read_text(encoding='utf-8')
ts_path=root/'apps/web/src/features/chart/lib/palace-relation-lines.ts'
js_script = r'''
const fs=require('node:fs');
const cp=require('node:child_process');
const ts=require(cp.execFileSync(process.platform==='win32'?'npm.cmd':'npm',['root','-g'],{encoding:'utf8'}).trim()+'/typescript');
const src=fs.readFileSync(process.argv[1],'utf8');
const a=src.slice(src.indexOf('export function perimeterRelationPath('),src.indexOf('/** Gentle quadratic guide'));
const b=src.slice(src.indexOf('export function silkPerimeterRelationPath('));
const out=ts.transpileModule(a+'\n'+b,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
process.stdout.write(out);
'''
js=subprocess.check_output(['node','-e',js_script,str(ts_path)],text=True)
helpers="<script>\n(function(){const exports={};\n"+js+"\nwindow.previewSilkRoute=(a,b,center,index)=>exports.silkPerimeterRelationPath(a,b,center,12+index*8,12);\n})();\n</script>\n"
html=html.replace('<script>\n// The preview uses the same 230 ms',helpers+'<script>\n// The preview uses the same 230 ms',1)
html=html.replace('const guide=v11CurvedGuide(edge.a,edge.b);','const guide=previewSilkRoute(edge.a,edge.b,geometry.center,index);')
html=html.replace(' const geometry={width:rect.width,height:rect.height};', ''' const centerRect=grid.querySelector('.atlas-center').getBoundingClientRect();
 const geometry={width:rect.width,height:rect.height,center:{
   left:centerRect.left-rect.left,top:centerRect.top-rect.top,
   right:centerRect.right-rect.left,bottom:centerRect.bottom-rect.top
 }};''')
html=html.replace('Thiên Đồ V11.1 · Đối chiếu cung mượt mà','Thiên Đồ V11.2 · Đường chỉ mềm quanh tâm lá số')
html=html.replace('V11.1 · FLUID RELATIONS','V11.2 · SILK THREAD ROUTING')
# Actual chart-heritage.css already contains the ink restraint rules.
out=root/'previews/v11-silk-thread-preview.html'
out.write_text(html,encoding='utf-8')
print(out)
