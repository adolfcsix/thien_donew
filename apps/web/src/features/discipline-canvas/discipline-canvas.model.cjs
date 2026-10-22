/** Presentation-only transforms of engine results. No rule engine, forecasts or persistence. */
'use strict';
const LUO_SHU=Object.freeze([4,9,2,3,5,7,8,1,6]);
const DIRECTIONS=Object.freeze(['Bắc','Đông Bắc','Đông','Đông Nam','Nam','Tây Nam','Tây','Tây Bắc']);
function hexRows(bits, changingLine = null) {
 if(typeof bits!=='string'|| !/^[01]{6}$/.test(bits))throw new RangeError('Sơ đồ phải có đúng sáu hào 0/1.');
 if(changingLine!==null&&(!Number.isInteger(changingLine)||changingLine<1||changingLine>6))throw new RangeError('Hào động phải ở vị trí 1–6.');
 return Object.freeze(Array.from({length:6},(_,i)=>{const position=6-i;return Object.freeze({position,bit:bits[position-1],moving:position===changingLine});}));
}
function palaceCells(palaces) {
 if(!Array.isArray(palaces))throw new TypeError('Danh sách cung phải là mảng.');
 const byId=new Map(palaces.map(p=>[p.number,p]));
 if(palaces.length!==9||byId.size!==9||!LUO_SHU.every(n=>byId.has(n)))throw new RangeError('Lạc Thư cần chín cung duy nhất (1–9).');
 return Object.freeze(LUO_SHU.map(number=>Object.freeze({number,...byId.get(number)})));
}
function directionGroups(sectors) {
 if(!Array.isArray(sectors)||sectors.length!==24)throw new RangeError('Địa bàn cần đúng 24 sơn.');
 const groups=DIRECTIONS.map(direction=>Object.freeze({direction,sectors:Object.freeze(sectors.filter(s=>s.direction===direction))}));
 if(groups.some(g=>g.sectors.length!==3)||new Set(sectors.map(s=>s.name)).size!==24)throw new RangeError('Mỗi phương phải có ba sơn phân biệt.');
 return Object.freeze(groups);
}
module.exports={LUO_SHU,DIRECTIONS,hexRows,palaceCells,directionGroups};
