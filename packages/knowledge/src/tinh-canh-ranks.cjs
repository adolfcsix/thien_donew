"use strict";
// V11.159: immutable ruleset; changing thresholds requires a migration and new ruleset ID.
const RULESET='tinh-canh-v11.159.0';
const stages=[
 ['Khởi Nguyên',['Tinh Mầm','Sơ Kiến','Tầm Quang']],
 ['Khám Phá',['Quan Tượng','Tầm Tinh','Tinh Hành']],
 ['Thấu Hiểu',['Giải Tượng','Thông Huyền','Minh Tinh']],
 ['Tinh Thông',['Huyền Văn','Thiên Cơ','Ngự Tinh']],
 ['Siêu Việt',['Tinh Chủ','Vạn Tượng','Thái Hư']],
 ['Thiên Đồ',['Thiên Khải','Tinh Hà Bất Diệt','Vô Cực Tinh Đồ']]
];
const thresholds=[0,20,50,90,140,200,280,370,480,620,780,960,1170,1410,1680,1990,2340,2740];
const directions=['hoc-gia','luan-gia','kham-pha-gia','nguoi-dan-loi'];
const awards=Object.freeze({
 'learning-reviewed':Object.freeze({direction:'hoc-gia',points:8,source:'study'}),
 'article-published':Object.freeze({direction:'hoc-gia',points:18,source:'document'}),
 'research-reviewed':Object.freeze({direction:'hoc-gia',points:22,source:'document'}),
 'exploration-reviewed':Object.freeze({direction:'kham-pha-gia',points:10,source:'study'}),
 'guide-verified':Object.freeze({direction:'nguoi-dan-loi',points:12,source:'comment'}),
 'discussion-verified':Object.freeze({direction:'luan-gia',points:6,source:'comment'})
});
const milestone=Object.freeze({
 4:{paths:2,events:3},7:{paths:2,events:6},10:{paths:3,events:12},
 13:{paths:3,events:20},16:{paths:4,events:30},18:{paths:4,events:45}
});
const ranks=Object.freeze(stages.flatMap(([stage,names],stageIndex)=>names.map((name,j)=>Object.freeze({
 level:stageIndex*3+j+1,stage:stageIndex+1,stageName:stage,name,
 points:thresholds[stageIndex*3+j],badge:`tinh-canh-${String(stageIndex*3+j+1).padStart(2,'0')}`,
 effect:stageIndex*3+j+1<10?'static':['edge-glow','center-spark','orbit','halo','dual-orbit','constellation','celestial-disc','layered-disc','infinite-cosmos'][stageIndex*3+j-9]
}))));
function finiteNonnegative(n){return Number.isSafeInteger(n)&&n>=0;}
function evaluate(points,counts={},legacy=0,legacyCount=legacy>0?1:0){
 if(!finiteNonnegative(points)||!finiteNonnegative(legacy)||!finiteNonnegative(legacyCount))throw new TypeError('Invalid points');
 if(Object.values(counts).some(x=>!finiteNonnegative(x)))throw new TypeError('Invalid contribution counts');
 const total=points+legacy;if(!Number.isSafeInteger(total))throw new TypeError('Points overflow');
 const tally=directions.map(d=>counts[d]||0),distinct=tally.filter(n=>n>0).length+(legacyCount>0&&!(counts['luan-gia']>0)?1:0);
 const events=tally.reduce((a,b)=>a+b,0)+legacyCount;
 let rank=ranks[0],gate=null;
 for(const candidate of ranks.slice(1)){
  if(total<candidate.points)break;
  const required=milestone[candidate.level];
  if(required&&(distinct<required.paths||events<required.events)){gate={level:candidate.level,paths:required.paths,events:required.events,havePaths:distinct,haveEvents:events};break;}
  rank=candidate;
 }
 return {ruleset:RULESET,rank,points:total,newPoints:points,legacyPoints:legacy,directions:Object.fromEntries(directions.map((d,i)=>[d,tally[i]])),nextRank:ranks[rank.level]||null,blockedBy:gate};
}
function visibleRanking(row){return {userId:row.userId,displayName:row.displayName,points:Number(row.points),level:Number(row.level),rankName:row.rankName};}
module.exports=Object.freeze({RULESET,ranks,stages,directions,awards,milestone,evaluate,visibleRanking});
