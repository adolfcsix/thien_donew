'use strict';
/**
 * V11.69. Star-centric evidence ledger for the natal FOUR COURTS.
 * Position-only. Never adds a star, infers missing annual data, or certifies
 * a traditional formation. Only fields returned by the chart engine are read.
 */
const taxonomy = require('../../knowledge/src/star-display-groups.json');
const NATAL_FIELDS = Object.freeze([
  'stars','auxiliaryStars','yearStars','additionalStars','traditionalStars',
  'natalExtensionStars','beneficStars','positionalStars','missingStars',
  'derivedStars','advancedStars'
]);
const RELATIONS = Object.freeze([
  {offset:0,label:'Tọa cung'}, {offset:4,label:'Tam hợp'},
  {offset:8,label:'Tam hợp'}, {offset:6,label:'Đối cung'}
]);
const SUPPORT = new Set(taxonomy.support);
const CHALLENGING = new Set(taxonomy.challenging);
function getNatalNames(house){
  const names=NATAL_FIELDS.flatMap(key=>Array.isArray(house[key])?house[key]:[]);
  for(const key of ['thaiTue','bacSi','trangSinh']){
    if(Array.isArray(house.cycleStars?.[key]))names.push(...house.cycleStars[key]);
  }
  return [...new Set(names.filter(name=>typeof name==='string' && name.trim().length>0))];
}
function buildStarEvidenceMatrix(houses, branchIndex, name){
  if(!Array.isArray(houses)||houses.length!==12)throw new TypeError('Cần 12 cung để đọc Tứ chính.');
  if(!Number.isInteger(branchIndex)||branchIndex<0||branchIndex>11)throw new RangeError('Địa chi không hợp lệ.');
  if(typeof name!=='string'||!name.trim())throw new TypeError('Thiếu tên sao.');
  const byBranch = new Map();
  for(const house of houses){
    if(!house || !Number.isInteger(house.branchIndex) || house.branchIndex<0 || house.branchIndex>11 ||byBranch.has(house.branchIndex)){
      throw new TypeError('Lá số có địa chi thiếu hoặc trùng.');
    }
    byBranch.set(house.branchIndex,house);
  }
  const selectedHouse=byBranch.get(branchIndex);
  if(!getNatalNames(selectedHouse).includes(name))throw new RangeError('Sao không hiện diện tại cung đang chọn.');
  const courts=RELATIONS.map(({offset,label})=>{
    const index=(branchIndex+offset)%12, house=byBranch.get(index);
    const natal=new Set(getNatalNames(house));
    const main=Array.isArray(house.stars)?[...house.stars]:[];
    const transformations=Array.isArray(house.tuHoa)?house.tuHoa.filter(item=>item&&typeof item.name==='string'&&typeof item.star==='string')
      .map(item=>({name:item.name,target:item.star,verified:natal.has(item.star)})):[];
    return {
      relation:label,branchIndex:index,branch:house.branch,palace:house.palace,
      mainStars:main,
      mainStrengths:(house.mainStarStrengths??[]).filter(item=>main.includes(item.name))
        .map(item=>({name:item.name,status:item.status,label:item.label})),
      supportStars:[...natal].filter(star=>SUPPORT.has(star)),
      challengingStars:[...natal].filter(star=>CHALLENGING.has(star)),
      starCount:natal.size,
      transformations,
      obstructions:[...(house.obstructionMarkers??[])],
      names:[...natal]
    };
  });
  const focus=courts[0], opposite=courts[3];
  return {
    scope:'natal-four-courts-only', star:name, branchIndex, palace:focus.palace,
    courts,
    selectedTransformations:focus.transformations.filter(t=>t.target===name&&t.verified),
    voChinhDieu:focus.mainStars.length===0,
    oppositeMainStarsForReference:focus.mainStars.length===0 ? [...opposite.mainStars] : [],
    issues:courts.flatMap(c=>c.transformations.filter(t=>!t.verified)
      .map(t=>`${t.name} tại ${c.palace} có đích ${t.target} chưa đối chiếu được trong các lớp sao bản mệnh.`)),
    reviewedByExpert:false,
    notice:'Đây là bằng chứng vị trí bản mệnh theo engine. Tam phương Tứ chính không chứng minh thành cách cục, cát/hung hoặc sự kiện. Không dùng sao lưu năm xem trong bảng này.'
  };
}
module.exports={buildStarEvidenceMatrix,getNatalNames};
