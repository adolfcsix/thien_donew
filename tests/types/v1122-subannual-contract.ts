import type {AstrologyResult} from '@thiendo/shared-types';
import {calculateSubannualBranches,getSubannualResearch} from '@thiendo/interpretation';
declare const chart:AstrologyResult;
const places=calculateSubannualBranches(chart,{year:2026,month:1,day:1,hour:12});
const monthPalace:string=places.luuNguyet.palace;
const dayPalace:string=getSubannualResearch(chart,2026,1,false,1,23).luuNhat.palace;
const noMonthlyStars:false=places.coverage.monthlyStars;
void monthPalace;void dayPalace;void noMonthlyStars;
