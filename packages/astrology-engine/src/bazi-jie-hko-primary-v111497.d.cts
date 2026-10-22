export interface PrimaryHkoJieEvent {year:number;term:string;month:number;monthIndex:number;solarLongitudeDegrees:number;localHkt:string;instantUtc:string;sourceUrl:string;}
export interface PrimaryHkoJieResolution {sourceId:string;instantUtc:string;publishedPrecision:'minute';timezone:'Asia/Hong_Kong';researchOnly:true;canCalculateYearMonthPillars:false;canCalculateDaYun:false;status:'OUT_OF_COVERAGE'|'BOUNDARY_REVIEW'|'RESOLVED_RESEARCH_ONLY';active:PrimaryHkoJieEvent|null;next:PrimaryHkoJieEvent|null;boundary?:PrimaryHkoJieEvent|null;note?:string;}
export declare const TABLE_VERSION:string;
export declare const YEARS:readonly number[];
export declare const COVERAGE:{years:readonly number[];records:number;precision:'minute';timezone:'Asia/Hong_Kong';researchOnly:true;canCalculateYearMonthPillars:false;canCalculateDaYun:false};
export declare const DATA_SHA256:string;
export declare const EVENTS:readonly (PrimaryHkoJieEvent & {epochMs:number})[];
export declare function resolvePrimaryHkoJie(input:{instantIso:string}):PrimaryHkoJieResolution;
export declare function auditPrimaryMinuteLedger(data:unknown):{status:string;errors:readonly string[];records:number;years:readonly number[];precision:'minute';independentChartFixtures:0;automaticallyPromotedPillars:0};
