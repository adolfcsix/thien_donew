'use strict';
/** Same presentation taxonomy consumed by the Next.js atlas.
 * Separate from the placement engine: a color is not an astrological verdict. */
const groups=require('../../knowledge/src/star-display-groups.json');
const sets=Object.fromEntries(['main','support','challenging','transform'].map(key=>[key,new Set(groups[key])]));
function categoryFor(name,{annual=false,cycle=false}={}) {
  if(annual)return 'annual';
  if(cycle)return 'cycle';
  const title=String(name).split(' · ')[0].trim();
  for(const key of ['transform','main','challenging','support']) if(sets[key].has(title))return key;
  return 'neutral';
}
function colorFor(name,options) {return groups.colors[categoryFor(name,options)];}
module.exports=Object.freeze({categoryFor,colorFor});
