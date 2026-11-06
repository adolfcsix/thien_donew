import {isIP} from 'node:net';
export function privateIPv4(ip){if(isIP(ip)!==4)return false;const [a,b]=ip.split('.').map(Number);return a===10||a===192&&b===168||a===172&&b>=16&&b<=31;}
export function localLanOrigin(explicit,interfaces,port=3000){
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Cổng web không hợp lệ');
 const candidates=[...new Set(Object.values(interfaces).flat().filter(x=>x&&!x.internal&&privateIPv4(x.address)).map(x=>x.address))].sort();
 const ip=explicit|| (candidates.length===1?candidates[0]:null);
 if(!ip)throw Error('Cần chọn IP LAN rõ ràng: npm run dev:lan -- '+(candidates.join(' hoặc ')||'192.168.x.x'));
 if(!privateIPv4(ip)||!candidates.includes(ip))throw Error('IP phải là địa chỉ LAN của máy đang chạy website');
 return `http://${ip}:${port}`;
}

export function localLanEnvironment(explicit,interfaces,env){
 if(env.NODE_ENV==='production')throw Error('dev:lan chỉ dành cho phát triển; production cần HTTPS');
 if(env.COOKIE_SECURE==='true')throw Error('HTTP LAN không dùng được cookie Secure. Dùng HTTPS hoặc môi trường phát triển riêng; không đổi cấu hình production.');
 return {...env,WEB_ORIGIN:localLanOrigin(explicit,interfaces)};
}
