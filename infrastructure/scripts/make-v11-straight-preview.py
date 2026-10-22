"""Build the standalone straight-line chart preview from the actual TS route and latest V11.1 fixture."""
from pathlib import Path
import subprocess
root=Path(__file__).resolve().parents[2]
source=(root/'previews/v11-fluid-relations-preview.html').read_text(encoding='utf-8')
route=root/'apps/web/src/features/chart/lib/palace-relation-lines.ts'
js_script=r'''const fs=require('node:fs');const cp=require('node:child_process');
const ts=require(cp.execFileSync(process.platform==='win32'?'npm.cmd':'npm',['root','-g'],{encoding:'utf8'}).trim()+'/typescript');
const src=fs.readFileSync(process.argv[1],'utf8');
const func=src.slice(src.indexOf('export function straightRelationPath('));
const out=ts.transpileModule(func,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
process.stdout.write(out);'''
js=subprocess.check_output(['node','-e',js_script,str(route)],text=True)
helper='<script>\n(function(){const exports={};\n'+js+'\nwindow.previewStraightRoute=(start,end)=>exports.straightRelationPath(start,end);})();\n</script>\n'
source=source.replace('<script>\n// The preview uses the same 230 ms',helper+'<script>\n// The preview uses the same 230 ms',1)
source=source.replace('const guide=v11CurvedGuide(edge.a,edge.b);','const guide=previewStraightRoute(edge.a,edge.b);')
source=source.replace('Thiên Đồ V11.1 · Đối chiếu cung mượt mà','Thiên Đồ V11.3 · Đối chiếu cung bằng nét thẳng')
source=source.replace('V11.1 · FLUID RELATIONS','V11.3 · DIRECT STRAIGHT CONNECTIONS')
source=source.replace('Rê chuột để thấy đường nối chuyển vị trí mềm mại','Rê chuột để thấy đường nối thẳng chuyển vị trí mềm mại')
# Derive the heritage palettes directly from the active stylesheet.
heritage=(root/'apps/web/src/app/chart-heritage.css').read_text(encoding='utf-8')
source=source.replace('</style></head>',heritage[heritage.rfind('/* V11.3: straight traditional guides;'):]+'\n</style></head>',1)
out=root/'previews/v11-straight-relations-preview.html'
out.write_text(source,encoding='utf-8')
print(out)
