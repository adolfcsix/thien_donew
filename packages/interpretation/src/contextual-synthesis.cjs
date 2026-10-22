'use strict';
/** V11.28: explicit evidence-first composition, not a fortune prediction engine. */
const {lookupPrimaryStarPalace,combinationRules,primaryStarPalaceGuidance}=require('../../knowledge/src/index.cjs');
const MAIN=Object.freeze(Object.keys(primaryStarPalaceGuidance.records));
const STAR_KEYS=['stars','auxiliaryStars','additionalStars','traditionalStars','natalExtensionStars','beneficStars','positionalStars','derivedStars','advancedStars'];
function composePalaceReading(house,{includeRaw=false}={}) {
  if (!house || typeof house!=='object' || typeof house.name!=='string') throw new TypeError('house.name required');
  const present=new Set();
  for(const key of STAR_KEYS) {
    if(house[key]!==undefined && !Array.isArray(house[key])) throw new TypeError(`${key} must be array`);
    for(const item of house[key]??[]) {
      if(typeof item==='string' && item.trim()) present.add(item);
      else if(item && typeof item==='object' && typeof item.name==='string') present.add(item.name);
    }
  }
  const guidance=MAIN.filter(name=>present.has(name)).map(name=>({star:name,entry:lookupPrimaryStarPalace(name,house.name)})).filter(x=>x.entry).map(({star,entry})=>({star,focus:entry.focus,potential:entry.potential,tradeoff:entry.tradeoff,status:entry.status}));
  const combinations=combinationRules.filter(rule=>rule.conditions?.scope==='same-palace' && Array.isArray(rule.conditions.all) && rule.conditions.all.every(x=>present.has(x)))
    .map(rule=>({id:rule.id,title:rule.title,stars:[...rule.conditions.all],interpretation:rule.interpretation,caution:rule.caution,scope:'same-palace'}));
  const transformations=[];
  for(const item of house.tuHoa??[]) {
    if(!item || typeof item.name!=='string' || typeof item.star!=='string' || !present.has(item.star)) continue;
    const rule=combinationRules.find(x=>x.conditions?.scope==='natal-transformation' && x.conditions.name===item.name);
    if(rule) transformations.push({name:item.name,target:item.star,interpretation:rule.interpretation,caution:rule.caution});
  }
  const checks=['Đối chiếu chính tinh, phụ tinh và sát tinh đồng cung','Xem Tam phương Tứ chính từ lá số đầy đủ','Kiểm tra miếu vượng và tính nhất quán trường phái','Phân biệt sao bản mệnh với sao lưu và vận hạn'];
  const result={palace:house.name,primaryStars:guidance,combinations,transformations,checks,quality:{level:'editorial-unreviewed',validatedByExpert:false,usesOnlyExplicitPlacements:true,personalPrediction:false}};
  if(includeRaw) result.presentStars=[...present].sort((a,b)=>a.localeCompare(b,'vi'));
  return result;
}
module.exports={composePalaceReading};
