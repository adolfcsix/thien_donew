'use strict';
/** Public assets are intentional. Source archives/configuration/debug maps are not. */
function isSourcePath(raw){
 if(typeof raw!=='string')return true;
 let path=raw.split('?')[0];
 try{for(let i=0;i<2;i++){const decoded=decodeURIComponent(path);if(decoded===path)break;path=decoded;}}catch{return true;}
 if(/[\x00-\x1f\\]/.test(path))return true;
 return /^\/(?:\.git|\.svn|\.env(?:\.[^/]+)?|node_modules|packages|apps|infrastructure)(?:\/|$)/i.test(path)||/(?:^|\/)(?:package(?:-lock)?\.json|README\.md|HUONG_DAN\.md)$/i.test(path)||/\.(?:map|zip|sql|sqlite(?:3)?|bak|log|ts|tsx|cts|mts|cjs|mjs)$/i.test(path);
}
module.exports={isSourcePath};
