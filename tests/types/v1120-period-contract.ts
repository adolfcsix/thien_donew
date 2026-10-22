import type {AstrologyResult} from '@thiendo/shared-types';
import {comparePeriods} from '@thiendo/interpretation';
import type {PeriodTimeline,PeriodTimelineYear} from '@thiendo/interpretation';
declare const chart:AstrologyResult;
const result:PeriodTimeline=comparePeriods(chart,2026);
const year:PeriodTimelineYear=result.selected;
const label:string=year.canChi;
const positions:number[]=result.houses.map(p=>p.branchIndex);
const monthAvailable:boolean=result.coverage.luuNguyet;
// @ts-expect-error The year is a number, not a string
comparePeriods(chart,'2026');
void label;void positions;void monthAvailable;
