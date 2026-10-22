 'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const D=require('../../packages/astrology-engine/src/da-liu-ren-depth.cjs');
const names=['index','dayStem','dayBranch','monthGeneral','divinationHour','oldGate','oldVerdict','newGate','newSubtype','newVerdict','initial','middle','final','candidateCounts','traceLength'];
const rows=[],breakdown={},buckets={};
for(let i=0;i<60;i++)for(const monthGeneral of D.BRANCHES){
 const dayStem=D.STEMS[i%10],dayBranch=D.BRANCHES[i%12],divinationHour='Tý';
 const input={dayStem,dayBranch,monthGeneral,divinationHour,dayNight:'manual',manualPeriod:'day'};
 const before=D.buildDepthByMethod(input,D.LEGACY_RULESET),after=D.buildDepthByMethod(input,D.RULESET);
 if(after.verdict==='unresolved')throw Error(`Unresolved in v11.144: ${i}/${monthGeneral}`);
 const [initial,middle,final]=after.transmissions.sequence;
 const data={index:i,dayStem,dayBranch,monthGeneral,divinationHour,oldGate:before.gate,oldVerdict:before.verdict,newGate:after.gate,newSubtype:after.subtype,newVerdict:after.verdict,initial,middle,final,candidateCounts:after.sheHai?.scored.map(c=>`${c.upper}@${c.startEarth}:${c.count}`).join('|')||'',traceLength:after.trace.length};
 rows.push(data);
 const key=`${after.gate}/${after.subtype}`;breakdown[key]=(breakdown[key]||0)+1;
 if(before.verdict==='unresolved')buckets[before.gate]=(buckets[before.gate]||0)+1;
}
const escape=value=>/[,"\n]/.test(String(value))?'"'+String(value).replace(/"/g,'""')+'"':String(value);
const csv=names.join(',')+'\n'+rows.map(row=>names.map(col=>escape(row[col])).join(',')).join('\n')+'\n';
const book={zeiKe:338,sheHaiOrdinary:75,source:'《大六壬探原》九宗门汇总; book totals are categories, not audited 720 expected values'};
const local={zeiKe:rows.filter(x=>x.newGate==='zei-ke').length,sheHaiOrdinary:rows.filter(x=>x.newGate==='she-hai').length};
const evidence={method:D.RULESET,legacyMethod:D.LEGACY_RULESET,generatedAt:'2026-10-14',parameters:'60 sexagenary days x 12 month generals; divinationHour Tý; manual day period',total:rows.length,allResolved:rows.every(x=>x.newVerdict==='derived-subroutine-only'),legacyUnresolved:buckets,branches:breakdown,comparedToBook:{reference:book,local,discrepancies:{zeiKe:local.zeiKe-book.zeiKe,sheHaiOrdinary:local.sheHaiOrdinary-book.sheHaiOrdinary},status:'OPEN — do not call full traditional 720-case validation'},csvSha256:crypto.createHash('sha256').update(csv).digest('hex')};
if(process.argv.includes('--write')){
 const target=path.resolve(__dirname,'../../docs/reports/v11144-liuren-720-audit.csv');
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,csv);fs.writeFileSync(target.replace('.csv','.json'),JSON.stringify(evidence,null,2)+'\n');
}
console.log(JSON.stringify(evidence,null,2));
