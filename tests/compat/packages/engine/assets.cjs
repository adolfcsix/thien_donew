'use strict';
const path=require('node:path');
const names=new Set(['lunar','auxiliary','tuhoa','cycles','year-stars','tuvi','verify']);
const shared=new Set(['auxiliary','tuhoa','cycles','year-stars']);
function browserEnginePath(name){
 if(!names.has(name))return null;
 return shared.has(name)?path.resolve(__dirname,'../../../../packages/astrology-engine/src',name+'.js'):path.join(__dirname,name+'.js');
}
module.exports={browserEnginePath};
