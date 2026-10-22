'use strict';
/** Research registry only: does not grant any algorithm production permission. */
const source=require('./phase2-school-methods.json');
function freezeDeep(v){if(v&&typeof v==='object'){for(const child of Object.values(v))freezeDeep(child);Object.freeze(v);}return v;}
const registry=freezeDeep(source);
const getDiscipline=id=>typeof id==='string'?registry.disciplines.find(x=>x.id===id)||null:null;
const getSchool=id=>typeof id==='string'?registry.schools.find(x=>x.id===id)||null:null;
const listSchools=disciplineId=>registry.schools.filter(x=>x.disciplineId===disciplineId);
function gateSchoolExecution(id){
 const entry=getSchool(id);
 if(!entry)return Object.freeze({verdict:'BLOCKED',reason:'Unknown school/method ID'});
 if(entry.status==='deterministic-subroutine-only'&&entry.engineIntegration==='isolated-research-only')
  return Object.freeze({verdict:'RESEARCH_SUBROUTINE_ONLY',reason:'Only the explicitly documented deterministic subroutine is available; no full chart or divination'});
 return Object.freeze({verdict:'BLOCKED',reason:'No school-specific computation approved by the phase 2 registry; legacy features are separate'});
}
module.exports=Object.freeze({registry,getDiscipline,getSchool,listSchools,gateSchoolExecution});
