import type {AstrologyResult} from '@thiendo/shared-types';
export interface LunarMonthChoice {
 key:string;month:number;leap:boolean;displayName:string;firstSolarDate:string;
 days:Array<{lunarDay:number;solarDate:string}>;partial:boolean;
}
export interface TemporalExplorer {
 ruleSet:string;year:number;months:LunarMonthChoice[];
 selected:{month:number;leap:boolean;day:number;hour:number;monthKey:string;solarDate:string;lunarLabel:string;
  dayCanChi:string;yearCanChi:string;time:{hour:number;branchIndex:number;branch:string;period:string;boundaryNotice:string|null}};
 annual:{canChi:string;ageMu:number;daiHan:{branchIndex:number;palace:string;fromAge:number;toAge:number}|null;
  tieuHan:{branchIndex:number;palace:string;branch:string};luuThaiTue:{branchIndex:number;branch:string}};
 coverage:{calendarConversion:true;lunarLeapMonth:true;dayCanChi:true;earthlyBranchHour:true;annualPeriod:true;luuNguyet:false;luuNhat:false;luuThoi:false};
 note:string;
}
export declare const RULESET:string;
export declare function listLunarMonths(year:number):LunarMonthChoice[];
export declare function getHourBranch(hour:number):TemporalExplorer['selected']['time'];
export declare function getTemporalExplorer(chart:AstrologyResult,year:number,month?:number,leap?:boolean,day?:number,hour?:number):TemporalExplorer;
