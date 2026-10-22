'use strict';
const docket=require('./star-source-docket.json');
const comparison=require('./star-source-comparison.json');
const crosswalk=require('./reference-star-crosswalk.json');
const GATES=Object.freeze(['sourceIdentity','scopeDefined','placementCompared','independentChartFixture','schoolReview']);
function auditDocket(data=docket){
 const errors=[],sourceIds=new Set(),names=new Set();
 if(!data||data.automaticPlacement!==false||data.automaticAlias!==false)errors.push('Global gates must be explicitly closed');
 for(const source of data?.sources||[]){if(!source.id||sourceIds.has(source.id)||!/^https:\/\//.test(source.url)||!source.scope||!source.locations)errors.push('Invalid/duplicate source identity');sourceIds.add(source.id);}
 const expected=crosswalk.records.filter(r=>r.status!=='engine-name');
 for(const row of data?.records||[]){if(names.has(row.name))errors.push('Duplicate name: '+row.name);names.add(row.name);const original=expected.find(r=>r.name===row.name);if(!['missing','alias'].includes(row.category)||!original||(row.category==='missing')!==(original.status==='not-in-engine'))errors.push('Scope/category mismatch: '+row.name);if(row.automaticPlacement!==false||row.automaticAlias!==false)errors.push('Unreviewed automatic action: '+row.name);if(!row.next||!row.risk||!row.evidence||!row.sourceIds?.length||row.sourceIds.some(id=>!sourceIds.has(id)))errors.push('Missing evidence/next step: '+row.name);if(!row.gates||GATES.some(key=>typeof row.gates[key]!=='boolean'))errors.push('Missing gate: '+row.name);else if(GATES.every(key=>row.gates[key]))errors.push('Complete gates conflict with deferred scope: '+row.name);}
 if(names.size!==expected.length||expected.some(r=>!names.has(r.name)))errors.push('Incomplete 11 missing + 4 aliases coverage');
 return {errors,records:names.size,missing:(data?.records||[]).filter(r=>r.category==='missing').length,aliases:(data?.records||[]).filter(r=>r.category==='alias').length};
}
function branch(value){if(!Number.isInteger(value)||value<0||value>11)throw Error('Địa chi cần là số nguyên 0–11.');return value;}
function compareYearLayers(birthBranch,annualBranch,layer){branch(birthBranch);branch(annualBranch);if(!['birth','annual'].includes(layer))throw Error('Chọn rõ lớp năm sinh hoặc năm xem.');const index=layer==='birth'?birthBranch:annualBranch,row=structuredClone(comparison.circleRows[index]);return {scope:'research-only',layer,yearBranch:row.yearBranch,...row};}
function compareHour(hour){return structuredClone(comparison.hourRows[branch(hour)]);}
function normalized(text){return String(text).normalize('NFD').replace(/\p{M}/gu,'').replace(/[đĐ]/g,'d').trim().toLowerCase();}
function filterDocket(query='',category='all'){if(!['all','missing','alias'].includes(category))throw Error('Bộ lọc không hợp lệ.');const q=normalized(query);return docket.records.filter(r=>(category==='all'||r.category===category)&&(!q||normalized([r.name,r.candidate,r.hanzi,r.system,r.state].filter(Boolean).join(' ')).includes(q)));}
module.exports={GATES,auditDocket,compareYearLayers,compareHour,filterDocket};
