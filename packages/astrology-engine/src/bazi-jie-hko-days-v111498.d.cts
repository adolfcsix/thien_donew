export interface HkoJieDayEvent {year:number;month:number;day:number;term:string;solarLongitudeDegrees:number;localHktDate:string;sourceUrl:string;}
export interface HkoJieDayResolution {sourceId:string;localHktDate:string;timezone:'Asia/Hong_Kong';publishedPrecision:'calendar-day';researchOnly:true;canResolveJieInstant:false;canCalculateYearMonthPillars:false;canCalculateDaYun:false;status:'OUT_OF_COVERAGE'|'ON_JIE_DATE'|'DATE_ONLY_CONTEXT';active:HkoJieDayEvent|null;next:HkoJieDayEvent|null;sourceUrl?:string;note?:string;}
export declare const TABLE_VERSION:string;
export declare const YEARS:readonly number[];
export declare const DATA_SHA256:string;
export declare const EVENTS:readonly HkoJieDayEvent[];
export declare const AUDIT:{status:string;errors:readonly string[];years:readonly number[];records:number;precision:'calendar-day';verifiedMinuteTimes:0;automaticallyPromotedPillars:0};
export declare function auditOfficialDayLedger(data:unknown):typeof AUDIT;
export declare function resolveOfficialHkoJieDay(input:{instantIso:string}):HkoJieDayResolution;
