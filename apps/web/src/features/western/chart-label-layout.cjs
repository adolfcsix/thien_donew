'use strict';
/** Visual-only angular decluttering. Never changes astronomical coordinates. */
function normalize(angle) {
  if (!Number.isFinite(angle)) throw new TypeError('Góc nhãn phải là số hữu hạn.');
  return ((angle % 360) + 360) % 360;
}
/**
 * Distribute crowded glyphs around a ring while retaining each true longitude.
 * The largest unoccupied gap anchors the cyclic ordering; the remaining labels
 * are separated by at least minGap degrees. Leaders still point to true angles.
 * @param {{id:string, angle:number}[]} items
 * @param {number} minGap
 * @returns {{id:string, angle:number, labelAngle:number}[]}
 */
function layoutCircularLabels(items, minGap = 14) {
  if (!Array.isArray(items) || !Number.isFinite(minGap) || minGap <= 0 || items.length * minGap >= 360) {
    throw new RangeError('Số nhãn hoặc khoảng cách không phù hợp với một vòng tròn.');
  }
  const seen = new Set();
  const sorted = items.map(item => {
    if (!item || typeof item.id !== 'string' || !item.id || seen.has(item.id)) throw new TypeError('Mã nhãn phải khác nhau.');
    seen.add(item.id);
    return {id: item.id, angle: normalize(item.angle)};
  }).sort((a,b)=>a.angle-b.angle || a.id.localeCompare(b.id));
  if (sorted.length === 0) return [];
  if (sorted.length === 1) return [{...sorted[0], labelAngle:sorted[0].angle}];
  let maxGap=-1, start=0;
  for (let i=0;i<sorted.length;i++) {
    const next=sorted[(i+1)%sorted.length].angle + (i===sorted.length-1?360:0);
    const gap=next-sorted[i].angle;
    if(gap>maxGap){maxGap=gap;start=(i+1)%sorted.length;}
  }
  const linear=Array.from({length:sorted.length},(_,i)=>{
    const idx=(start+i)%sorted.length;
    return {...sorted[idx],unwrapped:sorted[idx].angle + (idx<start?360:0)};
  });
  const placed=[];
  for(const item of linear){
    placed.push(placed.length?Math.max(item.unwrapped,placed[placed.length-1]+minGap):item.unwrapped);
  }
  // Reserve the closing gap too: greedy forward placement can overrun the cut
  // when several separate clusters each need extra space.
  placed[placed.length-1]=Math.min(placed[placed.length-1],linear[0].unwrapped+360-minGap);
  for(let i=placed.length-2;i>=0;i--)placed[i]=Math.min(placed[i],placed[i+1]-minGap);
  // Center the displacement without changing separation. This avoids drifting
  // every label clockwise when several bodies share a tight longitude cluster.
  const centerShift=linear.reduce((sum,item,i)=>sum+(placed[i]-item.unwrapped),0)/linear.length;
  return linear.map((item,i)=>({id:item.id,angle:item.angle,labelAngle:normalize(placed[i]-centerShift)}));
}
module.exports={layoutCircularLabels,normalize};
