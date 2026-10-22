export interface JieDayEvidence {year:number;term:string;month:number;day:number;localHktDate:string;solarLongitudeDegrees:number;sourceUrl:string;}
export declare const SOURCE:string;
export declare const SOURCES:Readonly<Record<number,string>>;
export declare const TERM_DATES:readonly JieDayEvidence[];
export declare function auditDayLedger(records?:readonly JieDayEvidence[]):{errors:string[];records:number;years:readonly number[];precision:'calendar-day';verifiedMinuteTimes:0};
export declare function resolveJieDayEvidence(input:{instantIso:string}):{sourceId:string;localHktDate:string;timezone:'Asia/Hong_Kong';publishedPrecision:'calendar-day';researchOnly:true;canResolveJieInstant:false;canCalculateYearMonthPillars:false;status:'OUT_OF_COVERAGE'|'ON_JIE_DATE'|'DATE_ONLY_CONTEXT';active:JieDayEvidence|null;next:JieDayEvidence|null;sourceUrl?:string;note?:string};
