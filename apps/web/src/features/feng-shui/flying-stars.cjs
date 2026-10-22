/**
 * Huyền Không Phi Tinh — địa bàn vận (vận tinh) và niên bàn.
 * Cả hai bay thuận trên Lạc Thư. KHÔNG phải tam bàn nhà (sơn tinh / hướng tinh):
 * tam bàn cần tọa hướng 24 sơn, âm dương nguyên long và quy tắc trường phái.
 */
'use strict';
const PATH=Object.freeze([5,6,7,8,9,1,2,3,4]);
const PALACES=Object.freeze([
  {number:4,direction:'Đông Nam',trigram:'Tốn'}, {number:9,direction:'Nam',trigram:'Ly'}, {number:2,direction:'Tây Nam',trigram:'Khôn'},
  {number:3,direction:'Đông',trigram:'Chấn'}, {number:5,direction:'Trung cung',trigram:'—'}, {number:7,direction:'Tây',trigram:'Đoài'},
  {number:8,direction:'Đông Bắc',trigram:'Cấn'}, {number:1,direction:'Bắc',trigram:'Khảm'}, {number:6,direction:'Tây Bắc',trigram:'Càn'}
].map(x=>Object.freeze(x)));
const STARS=Object.freeze({
  1:{name:'Nhất Bạch',han:'一白',element:'Thủy'},2:{name:'Nhị Hắc',han:'二黑',element:'Thổ'},
  3:{name:'Tam Bích',han:'三碧',element:'Mộc'},4:{name:'Tứ Lục',han:'四綠',element:'Mộc'},
  5:{name:'Ngũ Hoàng',han:'五黃',element:'Thổ'},6:{name:'Lục Bạch',han:'六白',element:'Kim'},
  7:{name:'Thất Xích',han:'七赤',element:'Kim'},8:{name:'Bát Bạch',han:'八白',element:'Thổ'},
  9:{name:'Cửu Tử',han:'九紫',element:'Hỏa'}
});
function wrapStar(n){return ((n-1)%9+9)%9+1;}
function flyFromCenter(center,direction='forward'){
  if(!Number.isInteger(center)||center<1||center>9)throw new RangeError('Sao nhập trung phải từ 1 đến 9.');
  if(direction!=='forward'&&direction!=='reverse')throw new RangeError('Chiều bay chỉ nhận forward/reverse.');
  const delta=direction==='forward'?1:-1;
  const byPalace=new Map(PATH.map((number,step)=>[number,Object.freeze({number,step,star:wrapStar(center+step*delta),...STARS[wrapStar(center+step*delta)]})]));
  return Object.freeze(PALACES.map(p=>Object.freeze({...p,...byPalace.get(p.number)})));
}
function periodStarChart(period){
  if(!Number.isInteger(period)||period<1||period>9)throw new RangeError('Vận phải từ 1 đến 9.');
  return Object.freeze({period,center:period,positions:flyFromCenter(period),
    boundary:'Vận đổi tại Lập Xuân, không mặc định đổi ngày 01/01. Vận nhà xác định theo niên đại xây/cải tạo đã kiểm chứng.',
    limitation:'Chỉ có vận tinh. Chưa an sơn tinh, hướng tinh, thế quái và tổ hợp sao nhà.'});
}
function annualStarChart(solarYear){
  if(!Number.isInteger(solarYear)||solarYear<1900||solarYear>2099)throw new RangeError('Năm tiết khí hỗ trợ: 1900–2099.');
  const center=wrapStar(3-(solarYear-2024));
  return Object.freeze({solarYear,center,positions:flyFromCenter(center),
    boundary:'Năm dùng là niên độ Lập Xuân đã xác nhận, không tự suy từ năm dương lịch ngày sinh.',
    limitation:'Đây là sao lưu niên, không phải sao sơn/hướng của bản trạch.'});
}
function periodByConfirmedSolarYear(solarYear){
  if(!Number.isInteger(solarYear)||solarYear<1864||solarYear>2223)throw new RangeError('Năm vận hỗ trợ: 1864–2223.');
  const period=((Math.floor((solarYear-1864)/20)%9)+9)%9+1;
  return Object.freeze({solarYear,period,starts:1864+Math.floor((solarYear-1864)/20)*20,
    warning:'Năm cần tính theo Lập Xuân đã xác nhận. Không tự suy niên đại nhập trạch hay thay mái.'});
}
module.exports={PATH,PALACES,STARS,flyFromCenter,periodStarChart,annualStarChart,periodByConfirmedSolarYear};
