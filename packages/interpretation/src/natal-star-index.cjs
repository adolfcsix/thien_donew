'use strict';
/** Single-source natal positions for pair and multi-star research. No annual layer. */
const {NATAL_LAYERS}=require('./four-court-evidence.cjs');
function indexNatalStars(chart){
  const index=new Map();
  for(const house of chart.houses){
    for(const layer of NATAL_LAYERS){
      if(!Array.isArray(house[layer]))continue;
      for(const name of new Set(house[layer])){
        if(typeof name!=='string'||!name.trim())continue;
        if(!index.has(name))index.set(name,new Map());
        const sites=index.get(name);
        if(!sites.has(house.branchIndex))sites.set(house.branchIndex,new Set());
        sites.get(house.branchIndex).add(layer);
      }
    }
  }
  return index;
}
function locateNatalStar(index,houses,name){
 const recorded=index.get(name);
 if(!recorded)return {star:name,status:'absent',branches:[]};
 if(recorded.size!==1)return {star:name,status:'ambiguous',branches:[...recorded.keys()].sort((a,b)=>a-b)};
 const [branchIndex,layers]=[...recorded.entries()][0];
 const house=houses.get(branchIndex);
 return {star:name,status:'observed',branches:[branchIndex],branchIndex,branch:house.branch,
  palace:house.palace,layers:[...layers].sort()};
}
module.exports={indexNatalStars,locateNatalStar};
