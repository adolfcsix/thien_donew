'use strict';
/**
 * Read-only view model for natal classical-pattern evidence.
 * It does not make or modify astrological judgments: a match means only
 * that the *implemented structural checks* were observed, not validation
 * of the named classical formation. It never writes to a chart.
 */
const FILTERS=Object.freeze(['relevant','matched','review','not-met','all']);
const STATUSES=Object.freeze(['structural-match','needs-review','not-met']);
const CHECK_STATES=Object.freeze(['met','not-met','unknown']);

function summarizeChecks(record){
 if(!record||!Array.isArray(record.checks)||record.checks.length===0)
  throw new TypeError('Classical record must have a non-empty checks array');
 const summary={total:record.checks.length,met:0,notMet:0,unknown:0};
 for(const check of record.checks){
  if(!check||!CHECK_STATES.includes(check.state)||typeof check.label!=='string')
   throw new TypeError('Invalid classical evidence criterion');
  if(check.state==='met')summary.met++;
  else if(check.state==='not-met')summary.notMet++;
  else summary.unknown++;
 }
 const expected=summary.notMet?'not-met':summary.unknown?'needs-review':'structural-match';
 if(record.status!==expected)
  throw new RangeError('Contradictory classical criterion status for '+String(record.id));
 return Object.freeze(summary);
}
function summarizeClassicalEvidence(records){
 if(!Array.isArray(records))throw new TypeError('Expected a classical evidence record array');
 const byId=Object.create(null),counts={all:records.length,relevant:0,matched:0,review:0,notMet:0};
 for(const record of records){
  if(!record||typeof record.id!=='string'||!/^dinh-(?:phu|quy|ban|tap)-\d{2}$/.test(record.id)||
     !STATUSES.includes(record.status)||Object.hasOwn(byId,record.id))
   throw new RangeError('Missing, duplicate, or invalid classical research identifier');
  byId[record.id]=summarizeChecks(record);
  if(record.status==='structural-match'){counts.matched++;counts.relevant++;}
  else if(record.status==='needs-review'){counts.review++;counts.relevant++;}
  else counts.notMet++;
 }
 if(counts.matched+counts.review+counts.notMet!==counts.all)
  throw new RangeError('Classical evidence totals do not agree');
 return Object.freeze({counts:Object.freeze(counts),byId:Object.freeze(byId)});
}
function filterClassicalEvidence(records,filter='relevant'){
 if(!Array.isArray(records))throw new TypeError('Expected a classical evidence record array');
 if(!FILTERS.includes(filter))throw new RangeError('Unknown classical evidence filter');
 return Object.freeze(records.filter(record=>
  filter==='all'||
  (filter==='relevant'&&record.status!=='not-met')||
  (filter==='matched'&&record.status==='structural-match')||
  (filter==='review'&&record.status==='needs-review')||
  (filter==='not-met'&&record.status==='not-met')));
}
module.exports=Object.freeze({FILTERS,summarizeChecks,summarizeClassicalEvidence,filterClassicalEvidence});
