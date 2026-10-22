'use strict';
/** Editorial study-only comparison. This module must never be imported by the chart engine. */
const defaultData = require('./method-comparison-profiles.json');
const own = (obj,key) => Object.prototype.hasOwnProperty.call(obj,key);
function auditProfiles(data = defaultData) {
  const errors = [];
  if (!data || data.researchOnly !== true || data.autoPlacement !== false || data.expertReviewed !== false) errors.push('Global safety gates absent');
  const ids = new Set();
  const profiles = Array.isArray(data?.profiles) ? data.profiles : [];
  for (const profile of profiles) {
    if (ids.has(profile.id)) errors.push(`Duplicate profile: ${profile.id}`);
    ids.add(profile.id);
    const keys = profile.inputAxis === 'reference-year-branch' ? data.branches : data.stems;
    if (!['natal-year-stem','day-stem','reference-year-branch'].includes(profile.inputAxis)) errors.push(`Unexpected input axis: ${profile.id}`);
    if (!Array.isArray(keys) || keys.length !== (profile.inputAxis === 'reference-year-branch' ? 12 : 10) || new Set(keys).size !== keys.length) {errors.push(`Invalid input keys: ${profile.id}`);continue;}
    if (!profile.lookup || Object.keys(profile.lookup).length !== keys.length || keys.some(key=>!own(profile.lookup,key) || !data.branches.includes(profile.lookup[key]))) errors.push(`Incomplete lookup: ${profile.id}`);
    if (profile.ruleKind === 'cycle-offset' && keys.every(key=>own(profile.lookup??{},key)) && (!Number.isInteger(profile.offset) || keys.some((key,i) => profile.lookup[key] !== data.branches[(i+profile.offset)%12]))) errors.push(`Cycle mismatch: ${profile.id}`);
    if (!['cycle-offset','lookup'].includes(profile.ruleKind)) errors.push(`Unrecognized rule kind: ${profile.id}`);
    if (profile.methodStatus !== 'editorial-reference-unverified' || !Array.isArray(profile.sources) || profile.sources.length===0 || profile.sources.some(x=>!/^https:\/\//.test(x))) errors.push(`Missing research evidence: ${profile.id}`);
  }
  if (profiles.length !== 3) errors.push('Three scoped methods required');
  const deferred=Array.isArray(data?.deferredMethods)?data.deferredMethods:[];
  if (deferred.length !== 1 || deferred[0]?.id !== 'hong-diem-tuvi-natal-stem') errors.push('Unresolved Tử Vi Hồng Diễm must remain deferred');
  return {profiles:profiles.length,deferred:deferred.length,entries:profiles.reduce((n,p)=>n+Object.keys(p.lookup??{}).length,0),errors};
}
function lookupStudyPlacement(id,input,data=defaultData) {
  if (typeof id!=='string' || typeof input!=='string') throw new TypeError('Phải chọn phương pháp và can/chi bằng chuỗi');
  const profile=data.profiles.find(p=>p.id===id);
  if(!profile) throw new RangeError('Phương pháp chưa được cung cấp bảng tra');
  const allowed=profile.inputAxis==='reference-year-branch'?data.branches:data.stems;
  if(!allowed.includes(input)) throw new RangeError('Đầu vào không thuộc hệ can/chi của phương pháp đã chọn');
  if(!own(profile.lookup,input)) throw new RangeError('Bảng nghiên cứu chưa đủ dữ liệu');
  return Object.freeze({profileId:id,name:profile.name,system:profile.system,inputAxis:profile.inputAxis,input,branch:profile.lookup[input],researchOnly:true,autoPlacement:false,expertReviewed:false,warning:profile.warning});
}
module.exports=Object.freeze({auditProfiles,lookupStudyPlacement});
