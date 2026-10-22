'use strict';
const {makeBaseFormation,hourForDayBranch}=require('../../apps/web/src/features/ky-mon/formation.cjs');
const {buildRotatingHourPlate}=require('../../apps/web/src/features/ky-mon/hour-plate.cjs');
const {horseFromBranch,analyzeHourSignals}=require('../../apps/web/src/features/ky-mon/hour-signals.cjs');
const cases={total:0,hourHorses:{},dayHorses:{},strikeHits:0,withStrike:0};
for(let term=0;term<24;term++)for(let day=0;day<60;day++)for(let branch=0;branch<12;branch++){
 const hourCycleIndex=hourForDayBranch(day,branch).index;
 const base=makeBaseFormation({solarTermIndex:term,dayCycleIndex:day,hourCycleIndex});
 const plate=buildRotatingHourPlate(base);
 const x=analyzeHourSignals(base,plate);
 if(x.byPalace[x.hourHorse.palaceNumber].hourHorse!==true)throw Error('Mã giờ sai cung');
 if(x.byPalace[x.dayHorse.palaceNumber].dayHorse!==true)throw Error('Mã ngày sai cung');
 if(Object.values(x.byPalace).filter(p=>p.hourHorse).length!==1)throw Error('Mã giờ lặp');
 if(x.striking.some(p=>plate.byPalace[p.palace].heavenStem!==p.instrument))throw Error('Lục Nghi sai Thiên bàn');
 cases.total++;
 cases.hourHorses[x.hourHorse.palaceNumber]=(cases.hourHorses[x.hourHorse.palaceNumber]||0)+1;
 cases.dayHorses[x.dayHorse.palaceNumber]=(cases.dayHorses[x.dayHorse.palaceNumber]||0)+1;
 cases.strikeHits+=x.striking.length;cases.withStrike+=Number(x.striking.length>0);
}
if(cases.total!==17280)throw Error(`Audit incomplete ${cases.total}`);
for(const chi of ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'])if(!horseFromBranch(chi).palaceNumber)throw Error('Thiếu chi '+chi);
if(Object.keys(cases.hourHorses).length!==4||cases.strikeHits===0)throw Error('Uncovered rules');
console.log(JSON.stringify({version:'11.105',status:'PASS',...cases}));
