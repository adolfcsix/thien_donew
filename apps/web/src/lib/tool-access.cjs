'use strict';
const roots=Object.freeze(['/chart','/calendar','/good-days','/bazi','/iching','/mai-hoa','/luc-hao','/thai-at','/dai-luc-nham','/ky-mon','/phong-thuy','/ngu-hanh','/numerology','/tarot','/western-astrology','/ha-lac','/thiet-ban','/study','/collection','/birth-profiles','/admin','/forum/new','/forum/me','/membership','/pro','/consultation']);
function requiresToolLogin(path){return typeof path==='string'&&roots.some(root=>path===root||path.startsWith(root+'/'));}
// Only application tool routes can be return destinations. Reject external URLs,
// protocol-relative paths, backslashes, control characters and login loops.
function safeToolReturn(raw){
 if(typeof raw!=='string'||raw.length>2048||!raw.startsWith('/')||raw.startsWith('//')||/[\\\x00-\x20\x7f]/.test(raw))return '/chart';
 try{const url=new URL(raw,'https://thiendo.invalid');if(url.origin!=='https://thiendo.invalid'||!requiresToolLogin(url.pathname))return '/chart';return url.pathname+url.search+url.hash;}catch{return '/chart';}
}
module.exports={requiresToolLogin,safeToolReturn};
