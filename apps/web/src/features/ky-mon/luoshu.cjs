/** Kỳ Môn Độn Giáp · địa bàn nền Lạc Thư, KHÔNG phải bàn Kỳ Môn theo giờ. */
'use strict';
const PALACES=Object.freeze([
 {number:4,direction:'Đông Nam',trigram:'Tốn',symbol:'☴',element:'Mộc',position:[0,0]},
 {number:9,direction:'Nam',trigram:'Ly',symbol:'☲',element:'Hỏa',position:[0,1]},
 {number:2,direction:'Tây Nam',trigram:'Khôn',symbol:'☷',element:'Thổ',position:[0,2]},
 {number:3,direction:'Đông',trigram:'Chấn',symbol:'☳',element:'Mộc',position:[1,0]},
 {number:5,direction:'Trung cung',trigram:'Không có quái riêng',symbol:'◉',element:'Thổ',position:[1,1]},
 {number:7,direction:'Tây',trigram:'Đoài',symbol:'☱',element:'Kim',position:[1,2]},
 {number:8,direction:'Đông Bắc',trigram:'Cấn',symbol:'☶',element:'Thổ',position:[2,0]},
 {number:1,direction:'Bắc',trigram:'Khảm',symbol:'☵',element:'Thủy',position:[2,1]},
 {number:6,direction:'Tây Bắc',trigram:'Càn',symbol:'☰',element:'Kim',position:[2,2]},
]);
const EIGHT_GATES=Object.freeze(['Hưu','Sinh','Thương','Đỗ','Cảnh','Tử','Kinh','Khai']);
const THREE_WONDERS=Object.freeze(['Ất','Bính','Đinh']);
const SIX_INSTRUMENTS=Object.freeze(['Mậu','Kỷ','Canh','Tân','Nhâm','Quý']);
const NINE_STARS=Object.freeze(['Thiên Bồng','Thiên Nhuế','Thiên Xung','Thiên Phụ','Thiên Cầm','Thiên Tâm','Thiên Trụ','Thiên Nhậm','Thiên Anh']);
const EIGHT_DEITIES=Object.freeze(['Trực Phù','Đằng Xà','Thái Âm','Lục Hợp','Bạch Hổ','Huyền Vũ','Cửu Địa','Cửu Thiên']);
function getPalace(number){return PALACES.find(p=>p.number===number)||null;}
function oppositePalace(number){const p=getPalace(number);return p?getPalace(number===5?5:10-number):null;}
function verifyLuoShu(){
 const grid=[PALACES.slice(0,3),PALACES.slice(3,6),PALACES.slice(6,9)].map(row=>row.map(p=>p.number));
 const sums=[...grid.map(row=>row.reduce((a,b)=>a+b,0)),...[0,1,2].map(i=>grid.reduce((a,row)=>a+row[i],0)),grid[0][0]+grid[1][1]+grid[2][2],grid[0][2]+grid[1][1]+grid[2][0]];
 return Object.freeze({grid,sums,valid:sums.every(n=>n===15)});
}
module.exports={PALACES,EIGHT_GATES,THREE_WONDERS,SIX_INSTRUMENTS,NINE_STARS,EIGHT_DEITIES,getPalace,oppositePalace,verifyLuoShu};
