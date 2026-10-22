/**
 * V11.135 · Huyền Không Đại Quái: vòng quẻ Hậu Thiên/tiên thiên của hệ San Nguyên.
 * Atlas theo bảng số độ công khai Wikibooks, CC BY-SA; ghi xuất xứ ở docs/research/
 * Không trộn Quái vận (1..9 bỏ 5) với Vận tinh Phi Tinh, không luận thực địa.
 * Binary lưu từ HÀO TRÊN xuống HÀO DƯỚI, đúng ký hiệu bảng nguồn.
 * Chỉ số 'slotLine' = phân đoạn hình học theo chiều kim đồng hồ, KHÔNG khẳng định số hào cổ.
 */
'use strict';
const {normalizeDegrees}=require('./compass.cjs');
const WIDTH=360/64;
const LINE_WIDTH=WIDTH/6;
const SOURCE=Object.freeze({id:'wikibooks-xuan-kong-da-gua-circular-2026-08-16',url:'https://en.wikibooks.org/wiki/Feng_Shui/Xuan_Kong_Da_Gua/Binary_Representation_of_the_64_Hexagrams',license:'CC BY-SA 4.0',scope:'64 quẻ vòng la kinh, số quẻ, nhị phân, Quái khí và Quái vận trong một bảng tham chiếu; còn dị bản theo trường phái.'});
// number (King Wen) ; tên Hán ; binary (trên->dưới) ; Quái khí ; Quái vận
const ROWS=`24 復 000001 1 8
27 頤 100001 6 3
3 屯 010001 7 4
42 益 110001 2 9
51 震 001001 8 1
21 噬嗑 101001 3 6
17 隨 011001 4 7
25 無妄 111001 9 2
36 明夷 000101 1 3
22 賁 100101 6 8
63 既濟 010101 7 9
37 家人 110101 2 4
55 豐 001101 8 6
30 離 101101 3 1
49 革 011101 4 2
13 同人 111101 9 7
19 臨 000011 1 4
41 損 100011 6 9
60 節 010011 7 8
61 中孚 110011 2 3
54 歸妹 001011 8 7
38 睽 101011 3 2
58 兌 011011 4 1
10 履 111011 9 6
11 泰 000111 1 9
26 大畜 100111 6 4
5 需 010111 7 3
9 小畜 110111 2 8
34 大壯 001111 8 2
14 大有 101111 3 7
43 夬 011111 4 6
1 乾 111111 9 1
44 姤 111110 9 8
28 大過 011110 4 3
50 鼎 101110 3 4
32 恆 001110 8 9
57 巽 110110 2 1
48 井 010110 7 6
18 蠱 100110 6 7
46 升 000110 1 2
6 訟 111010 9 3
47 困 011010 4 8
64 未濟 101010 3 9
40 解 001010 8 4
59 渙 110010 2 6
29 坎 010010 7 1
4 蒙 100010 6 2
7 師 000010 1 7
33 遯 111100 9 4
31 咸 011100 4 9
56 旅 101100 3 8
62 小過 001100 8 3
53 漸 110100 2 7
39 蹇 010100 7 2
52 艮 100100 6 1
15 謙 000100 1 6
12 否 111000 9 9
45 萃 011000 4 4
35 晉 101000 3 3
16 豫 001000 8 8
20 觀 110000 2 2
8 比 010000 7 7
23 剝 100000 6 6
2 坤 000000 1 1`;
const ATLAS=Object.freeze(ROWS.split('\n').map((line,index)=>{
 const [rawNumber,han,binary,rawQi,rawPeriod]=line.split(' ');
 const kingWen=Number(rawNumber),qi=Number(rawQi),guaPeriod=Number(rawPeriod);
 return Object.freeze({index,ordinal:index+1,kingWen,han,symbol:String.fromCodePoint(0x4dc0+kingWen-1),binary,qi,guaPeriod,
  from:index*WIDTH,to:(index+1)*WIDTH,sourceId:SOURCE.id});
}));
const ELEMENT_BY_QI=Object.freeze({1:'Thủy',6:'Thủy',2:'Hỏa',7:'Hỏa',3:'Mộc',8:'Mộc',4:'Kim',9:'Kim'});
function slotAtDegrees(degrees){return Math.floor(normalizeDegrees(degrees)/WIDTH);}
function distanceToCircularBoundary(degrees,width){const r=normalizeDegrees(degrees)%width;return Math.min(r,width-r);}
function validateAccuracy(accuracy){if(typeof accuracy!=='number'||!Number.isFinite(accuracy)||accuracy<0||accuracy>180)throw new RangeError('Sai số đo phải là số hữu hạn từ 0 đến 180 độ.');return accuracy;}
function hexagramAt(degrees,accuracy=0){
 const d=normalizeDegrees(degrees);validateAccuracy(accuracy);
 const slot=slotAtDegrees(d),record=ATLAS[slot];
 const offset=d-record.from,slotLine=Math.min(6,Math.floor(offset/LINE_WIDTH)+1);
 const distanceHex=distanceToCircularBoundary(d,WIDTH);
 const distanceLine=distanceToCircularBoundary(d,LINE_WIDTH);
 // Dùng điều kiện >= để không xem đúng đường ranh là chắc chắn ngay cả khi sai số 0.
 const uncertainHex=distanceHex<=accuracy+1e-9;
 const uncertainLine=distanceLine<=accuracy+1e-9;
 return Object.freeze({...record,degrees:d,slotLine,slotLineFrom:record.from+(slotLine-1)*LINE_WIDTH,slotLineTo:record.from+slotLine*LINE_WIDTH,
  distanceHexBoundary:distanceHex,distanceLineBoundary:distanceLine,accuracy,
  hexagramStable:!uncertainHex,lineStable:!uncertainLine,
  warnings:Object.freeze([...(uncertainHex?['Sai số chạm biên quẻ; tên quẻ chưa thể xác nhận.']:[]),...(uncertainLine?['Sai số chạm biên phân đoạn hào; vị trí hào chưa thể xác nhận.']:[])])});
}
function greatHexagramPair(facingDegrees,accuracy=0){
 const facing=hexagramAt(facingDegrees,accuracy);
 const sitting=hexagramAt(facing.degrees+180,accuracy);
 const stable=facing.hexagramStable&&sitting.hexagramStable;
 const sameGuaPeriod=facing.guaPeriod===sitting.guaPeriod;
 const complementaryQi=facing.qi+sitting.qi===10;
 const inverseLines=[...facing.binary].every((bit,i)=>bit!==sitting.binary[i]);
 return Object.freeze({method:'Huyền Không Đại Quái / vòng 64 quẻ theo bảng tham chiếu Wikibooks',source:SOURCE,
  facing,sitting,accuracy,stable,sameGuaPeriod,complementaryQi,inverseLines,
  pairingVerified:stable&&sameGuaPeriod&&complementaryQi&&inverseLines,
  status:stable?'calculated':'measurement-uncertain',
  note:'Quái khí và Quái vận lấy từ atlas độc lập, khác với sao Phi Tinh. Không suy ra cát/hung hoặc khẳng định hào động.',
  limitation:'Phân đoạn hào theo góc chưa phải phép trừu hào hoán tượng; không tự suy đoán vượng suy, sinh khắc quái khí, nhật khóa hoặc phân kim theo dị bản.'});
}
module.exports={WIDTH,LINE_WIDTH,SOURCE,ATLAS,ELEMENT_BY_QI,slotAtDegrees,distanceToCircularBoundary,validateAccuracy,hexagramAt,greatHexagramPair};
