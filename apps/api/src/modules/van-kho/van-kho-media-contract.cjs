'use strict';
const {UUID}=require('./van-kho-contract.cjs');
const LIMIT=5*1024*1024;
const {rasterMime}=require('../../common/raster-image-validation.cjs');
function mediaType(data,format){
 const mime=rasterMime(data,format,LIMIT);
 if(!mime)throw Error('Ảnh phải là tệp PNG/JPEG/WebP hoàn chỉnh với kích thước và cấu trúc hợp lệ');
 return mime;
}

function imageReference(id){if(!UUID.test(id))throw Error('Mã ảnh không hợp lệ');return 'vk-image:'+id.toLowerCase();}
function mediaReferenced(body,id){return typeof body==='string' && body.includes(']('+imageReference(id)+')');}
function safeText(v,max){return typeof v==='string'&&v.trim().length>=5&&v.trim().length<=max&&!v.includes('\0')?v.trim():null;}
module.exports={LIMIT,mediaType,imageReference,mediaReferenced,safeText};
