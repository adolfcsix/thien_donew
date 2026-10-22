'use strict';
const FIELDS=['name','date','hour','minute','calendar','leap','gender','timeZone','birthPlace','latitude','longitude','timeAccuracy','notes'];
function invalid(message){throw new Error(message);}
function object(value){if(!value||typeof value!=='object'||Array.isArray(value))invalid('Hồ sơ sinh phải là đối tượng JSON');return value;}
function text(value,limit,required=false){if(typeof value!=='string'||value.length>limit*2)invalid('Văn bản không hợp lệ');const trimmed=value.trim();if(trimmed.length>limit||(required&&!trimmed)||/[\u0000-\u001f\u007f<>]/.test(trimmed))invalid('Độ dài hoặc ký tự không hợp lệ');return trimmed;}
function isoDate(value){if(typeof value!=='string'||!/^(19\d{2}|20\d{2}|2100)-\d{2}-\d{2}$/.test(value))invalid('Ngày sinh ngoài phạm vi 1900–2100');const d=new Date(value+'T00:00:00.000Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)invalid('Ngày sinh không tồn tại');return value;}
function numberOrNull(value,min,max){if(value===null||value===undefined||value==='')return null;if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)invalid('Tọa độ không hợp lệ');return value;}
function timeOrNull(value,max){if(value===null||value===undefined||value==='')return null;if(!Number.isInteger(value)||value<0||value>max)invalid('Giờ/phút không hợp lệ');return value;}
function validateBirthProfile(raw){const x=object(raw);if(Object.keys(x).some(key=>!FIELDS.includes(key)))invalid('Hồ sơ có trường không được hỗ trợ');if(Buffer.byteLength(JSON.stringify(x),'utf8')>4096)invalid('Hồ sơ vượt giới hạn 4 KB');
 const name=text(x.name,70,true),date=isoDate(x.date),hour=timeOrNull(x.hour,23),minute=timeOrNull(x.minute,59);
 if((hour===null)!==(minute===null))invalid('Giờ và phút phải cùng được nhập hoặc cùng để trống');
 const timeAccuracy=x.timeAccuracy??(hour===null?'unknown':'estimated');if(!['exact','estimated','unknown'].includes(timeAccuracy)||timeAccuracy==='unknown'&&hour!==null||timeAccuracy!=='unknown'&&hour===null)invalid('Mức chắc chắn giờ sinh không phù hợp');
 const calendar=x.calendar??'solar';if(!['solar','lunar'].includes(calendar))invalid('Loại lịch không hợp lệ');const leap=x.leap??false;if(typeof leap!=='boolean'||calendar==='solar'&&leap)invalid('Tháng nhuận không hợp lệ');
 const gender=x.gender??null;if(gender!==null&&!['Nam','Nữ'].includes(gender))invalid('Quy ước giới tính không hợp lệ');
 const timeZone=text(x.timeZone??'Asia/Ho_Chi_Minh',64,true);try{new Intl.DateTimeFormat('en-US',{timeZone});}catch{invalid('Múi giờ IANA không hợp lệ');}
 const birthPlace=text(x.birthPlace??'',120),latitude=numberOrNull(x.latitude,-90,90),longitude=numberOrNull(x.longitude,-180,180);
 if((latitude===null)!==(longitude===null))invalid('Vĩ độ và kinh độ phải nhập cùng nhau');
 const notes=text(x.notes??'',1000);
 return {name,date,hour,minute,calendar,leap,gender,timeZone,birthPlace,latitude,longitude,timeAccuracy,notes};
}
module.exports={validateBirthProfile,isoDate};
