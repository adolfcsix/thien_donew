 'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const P=require('../../packages/astrology-engine/src/mai-hoa-profile.cjs'),R=require('../../apps/web/src/features/mai-hoa/evidence-reading.cjs');
let count=0;const originals=new Set(),lines=new Set();
for(const mode of ['sound-hour','later-heaven'])for(let a=1;a<=8;a++)for(let b=1;b<=8;b++)for(let h=1;h<=12;h++)for(const nuclearPolicy of ['original','pure-transformed']){
 const p=P.createMaiHoaProfile({mode,first:a,second:b,objectTrigram:a,directionTrigram:b,hourBranch:h,nuclearPolicy}),r=R.studyMaiHoa(p),bits=r.cast.original.bits,line=(a+b+h)%6||6;
 assert.equal(r.cast.changingLine,line);assert.equal([...bits].filter((v,i)=>v!==r.cast.transformed.bits[i]).length,1);
 const nb=r.nuclearSource==='original'?bits:r.cast.transformed.bits;assert.equal(r.nuclear.bits,nb.slice(1,4)+nb.slice(2,5));assert.equal(r.layers.length,4);assert.equal(r.interactions.length,10);assert.deepEqual(R.studyMaiHoa(JSON.parse(JSON.stringify(r.input))).nuclear,r.nuclear);originals.add(bits);lines.add(line);count++;
}
const fixtures=require('../../tests/fixtures/mai-hoa-v11129/primary-source-examples.json');for(const f of fixtures.cases){const r=R.studyMaiHoa(P.createMaiHoaProfile(f.input));assert.equal(r.cast.arithmetic.base,f.upperSeed);assert.equal(r.cast.arithmetic.total,f.lowerSeed);assert.equal(r.cast.arithmetic.movingSeed,f.movingSeed);assert.equal(r.cast.original.number,f.original);assert.equal(r.cast.changingLine,f.line);assert.equal(r.cast.transformed.number,f.transformed);assert.equal(r.nuclear.upper.id,f.nuclearUpper);assert.equal(r.nuclear.lower.id,f.nuclearLower);}
const out={primarySourceExamples:fixtures.cases.length,version:'11.129.0',verdict:'PASS',internalCases:count,originalHexagrams:originals.size,movingLines:lines.size,profiles:5,nuclearPolicies:2,scope:'Internal exact arithmetic/bit/round-trip checks, not prediction/expert certification.'};
if(process.argv.includes('--write')){const p=path.join(__dirname,'../../docs/reports/mai-hoa-audit.json');fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(out,null,2)+'\n');}console.log(JSON.stringify(out));
