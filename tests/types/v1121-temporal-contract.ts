import type {AstrologyResult} from '@thiendo/shared-types';
import {getTemporalExplorer,listLunarMonths,getHourBranch} from '@thiendo/interpretation';
import type {TemporalExplorer} from '@thiendo/interpretation';
declare const chart:AstrologyResult;
const detail:TemporalExplorer=getTemporalExplorer(chart,2026,1,false,1,12);
const date:string=detail.selected.solarDate;
const missing:boolean=detail.coverage.luuNhat;
const months:number=listLunarMonths(2025).length;
const hour:string=getHourBranch(23).branch;
// @ts-expect-error Year must be numeric
getTemporalExplorer(chart,'2026');
void date;void missing;void months;void hour;
