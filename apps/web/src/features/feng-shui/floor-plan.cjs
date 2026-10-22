/** Sơ đồ phân khu hướng dạng chín ô (không phải tỷ lệ hình học của mặt bằng thật). */
'use strict';
const ZONES=Object.freeze([
 {palace:4,direction:'Đông Nam'}, {palace:9,direction:'Nam'}, {palace:2,direction:'Tây Nam'},
 {palace:3,direction:'Đông'}, {palace:5,direction:'Trung cung'}, {palace:7,direction:'Tây'},
 {palace:8,direction:'Đông Bắc'}, {palace:1,direction:'Bắc'}, {palace:6,direction:'Tây Bắc'}
].map(x=>Object.freeze(x)));
const ROOM_TYPES=Object.freeze(['Chưa gán','Phòng khách','Phòng ngủ','Bếp','Phòng làm việc','Cửa ra vào','Phòng tắm','Kho','Sân/ban công','Khác']);
function blankFloorPlan(){return Object.freeze(Object.fromEntries(ZONES.map(z=>[z.palace,'Chưa gán'])));}
function assignRoom(plan,palace,room){
 if(!plan||typeof plan!=='object')throw new TypeError('Mặt bằng không hợp lệ.');
 if(!ZONES.some(z=>z.palace===palace))throw new RangeError('Cung không hợp lệ.');
 if(!ROOM_TYPES.includes(room))throw new RangeError('Loại khu vực không hợp lệ.');
 return Object.freeze({...plan,[palace]:room});
}
module.exports={ZONES,ROOM_TYPES,blankFloorPlan,assignRoom};
