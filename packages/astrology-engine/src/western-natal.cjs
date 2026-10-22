'use strict';
const Astronomy=require('astronomy-engine');
const {METHOD,ZONED_METHOD,validateInput,utcTime}=require('./western-input.cjs');
const BODIES=Object.freeze(['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto']);
const SIGNS=Object.freeze(['Bạch Dương','Kim Ngưu','Song Tử','Cự Giải','Sư Tử','Xử Nữ','Thiên Bình','Bọ Cạp','Nhân Mã','Ma Kết','Bảo Bình','Song Ngư']);
const ASPECTS=Object.freeze([{angle:0,name:'Đồng vị'},{angle:60,name:'Lục hợp'},{angle:90,name:'Vuông'},{angle:120,name:'Tam hợp'},{angle:180,name:'Đối đỉnh'}]);
const norm=n=>((n%360)+360)%360;
function angularDistance(a,b){const d=norm(a-b);return Math.min(d,360-d);}
function number(n,min,max,integer=false){if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max||integer&&!Number.isInteger(n))throw Error('Tham số số học nằm ngoài phạm vi.');return n;}
/** Intersections of the true ecliptic of date and geometric local horizon.
 * East-positive longitude; no refraction or topocentric planetary parallax.
 * Latitude is geodetic local vertical. Restrict |latitude|<=65, away from poles.
 */
function angles(time,latitude,longitude){
 number(latitude,-65,65);number(longitude,-180,180);
 const rad=Math.PI/180,theta=norm(Astronomy.SiderealTime(time)*15+longitude)*rad,phi=latitude*rad;
 const rotation=Astronomy.Rotation_ECT_EQD(time).rot,ce=rotation[1][1],se=rotation[1][2];
 const a=Math.cos(phi)*Math.cos(theta),b=Math.cos(phi)*Math.sin(theta)*ce+Math.sin(phi)*se;
 let asc=Math.atan2(-a,b);const east=-Math.sin(theta)*Math.cos(asc)+Math.cos(theta)*ce*Math.sin(asc);
 if(east<0)asc+=Math.PI;
 const mc=Math.atan2(Math.sin(theta),Math.cos(theta)*ce);
 return {ascendant:norm(asc/rad),midheaven:norm(mc/rad),localSiderealDegrees:norm(theta/rad),obliquityDegrees:Math.atan2(se,ce)/rad};
}
function houseFor(longitude,ascendant){return Math.floor(norm(longitude-Math.floor(ascendant/30)*30)/30)+1;}
function aspects(planets,orb){
 number(orb,0,10);const pairs=[];
 for(let i=0;i<planets.length;i++)for(let j=i+1;j<planets.length;j++){
  const separation=angularDistance(planets[i].longitude,planets[j].longitude);
  const target=ASPECTS.find(a=>Math.abs(separation-a.angle)<=orb+1e-10);
  if(target)pairs.push({first:planets[i].body,second:planets[j].body,name:target.name,targetAngle:target.angle,separation,orb:Math.abs(separation-target.angle)});
 }return pairs;
}
function ecliptic(body,time){return Astronomy.Ecliptic(Astronomy.GeoVector(body,time,true));}
function chartAt(input,time){
 const axes=angles(time,input.latitude,input.longitude);
 const planets=BODIES.map(body=>{
  const position=ecliptic(body,time),previous=ecliptic(body,new Date(time.getTime()-43200000)),next=ecliptic(body,new Date(time.getTime()+43200000));
  const speed=norm(next.elon-previous.elon+180)-180,longitude=norm(position.elon),signIndex=Math.floor(longitude/30);
  return {body,longitude,latitude:position.elat,distanceAu:Math.hypot(position.vec.x,position.vec.y,position.vec.z),speedDegreesPerDay:speed,motion:Math.abs(speed)<0.0001?'near-stationary':speed<0?'retrograde':'direct',signIndex,sign:SIGNS[signIndex],degreeInSign:longitude%30,house:houseFor(longitude,axes.ascendant)};
 });
 const firstSign=Math.floor(axes.ascendant/30),houses=Array.from({length:12},(_,i)=>{const signIndex=(firstSign+i)%12;return {number:i+1,cuspLongitude:signIndex*30,signIndex,sign:SIGNS[signIndex]};});
 return {input,utc:time.toISOString(),...axes,planets,houses,aspects:aspects(planets,input.orb),provenance:{engine:'Astronomy Engine',version:'2.1.19',coordinates:'apparent geocentric true ecliptic of date',zodiac:'tropical',houses:'whole-sign',angleMethod:'geometric true-ecliptic/horizon intersections',speedMethod:'central difference ±12h',reference:'https://github.com/cosinekitty/astronomy'},warnings:[input.method===ZONED_METHOD?'Múi giờ IANA '+input.timeZone+' · tzdb '+input.tzdbVersion+'. Dữ liệu trước 1970 có thể không phản ánh mọi địa phương; quy tắc tương lai có thể thay đổi.':'UTC offset do người dùng xác nhận; dữ liệu thủ công chưa được đối chiếu với IANA.','Whole Sign: nhà 1 bắt đầu ở 0° cung chứa Ascendant. MC có thể nằm ngoài nhà 10; không chuyển thành Placidus.','Vị trí địa tâm; chưa có topocentric, sidereal/ayanamsa, nút Mặt Trăng, Chiron, Transit, Progression, Synastry hoặc Composite.','Tốc độ là xấp xỉ sai phân ±12h; chưa phân loại góc hợp đang tiến tới/rời xa.','Các diễn giải biểu tượng truyền thống không phải dự báo đã được khoa học xác thực.']};
}
function calculate(raw){
 const input=validateInput(raw),time=utcTime(input),result=chartAt(input,time);
 if(input.uncertaintyMinutes){
  const samples=[-input.uncertaintyMinutes,0,input.uncertaintyMinutes].map(delta=>{const chart=delta===0?result:chartAt(input,new Date(time.getTime()+delta*60000));return {deltaMinutes:delta,utc:chart.utc,ascendant:chart.ascendant,midheaven:chart.midheaven,ascendantSign:Math.floor(chart.ascendant/30),planets:chart.planets.map(p=>({body:p.body,signIndex:p.signIndex,house:p.house}))};});
  result.sensitivity={minutes:input.uncertaintyMinutes,samples,changedBodies:BODIES.filter(body=>new Set(samples.map(s=>{const p=s.planets.find(p=>p.body===body);return p.signIndex+':'+p.house;})).size>1),ascendantSignChanged:new Set(samples.map(s=>s.ascendantSign)).size>1};
  result.warnings.push('Độ nhạy chỉ so ba mẫu UTC: sớm, trung tâm, muộn; có thể bỏ sót biến đổi ở giữa. Không phải hiệu chỉnh giờ sinh hoặc xác suất thống kê.');
 }
 return result;
}
/** Sample relative to validated UTC without rounding historical IANA seconds. */
function sampleNatalAtOffset(raw,deltaMinutes){
 const input=validateInput(raw);number(deltaMinutes,-120,120,true);
 const time=new Date(utcTime(input).getTime()+deltaMinutes*60000);
 if(time<new Date('1900-01-01T00:00:00Z')||time>=new Date('2101-01-01T00:00:00Z'))throw Error('Mẫu UTC nằm ngoài 1900–2100.');
 return chartAt(input,time);
}
module.exports={sampleNatalAtOffset,METHOD,ZONED_METHOD,BODIES,SIGNS,ASPECTS,validateInput,utcTime,angles,houseFor,angularDistance,aspects,calculate};
