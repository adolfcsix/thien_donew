'use strict';
/** Self-contained line ornaments: no fonts, remote assets or raster textures. */
const cloud='<path d="M0 24h30c13 0 13-16 3-16-8 0-10 9-4 11M5 31h35c18 0 20-29 1-29-7 0-12 4-14 9M12 38h34c10 0 18-6 21-14M0 17h10"/>';
function cloudPair(x,y,span=240){return `<g aria-hidden="true" pointer-events="none" fill="none" stroke="#a48a51" stroke-width="1.3" stroke-linecap="round"><g transform="translate(${x-span/2},${y})">${cloud}</g><g transform="translate(${x+span/2},${y}) scale(-1,1)">${cloud}</g><path d="M${x-13} ${y+24}l13-7 13 7-13 7Z" fill="#b89b60" stroke="none"/></g>`;}
function frameCorners(x,y,w,h){const line='<path d="M0 48V0h48M7 39V7h32M14 30V14h16M0 14h22v8H0M14 0v22h8V0"/>';return `<g aria-hidden="true" pointer-events="none" fill="none" stroke="#ad925b" stroke-width="1.2">${[[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]].map(([a,b,sx,sy])=>`<g transform="translate(${a},${b}) scale(${sx},${sy})">${line}</g>`).join('')}</g>`;}
module.exports={cloudPair,frameCorners};
