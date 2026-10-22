export interface NaOJEvent {
  year:number; month:number; term:string; solarLongitudeDegrees:number;
  localJst:string; localHkt:string; instantUtc:string; sourceUrl:string; hkoDayWitnessUrl:string;
}
export interface NaOJResolution {
  sourceId:string; instantUtc:string; publishedPrecision:'minute'; originalTimezone:'Asia/Tokyo';
  displayTimezone:'Asia/Hong_Kong'; researchOnly:true;
  canCalculateYearMonthPillars:false; canCalculateDaYun:false;
  status:'OUT_OF_COVERAGE'|'BOUNDARY_REVIEW'|'RESOLVED_RESEARCH_ONLY';
  active:NaOJEvent|null; next:NaOJEvent|null; boundary?:NaOJEvent|null; note?:string;
}
export declare const TABLE_VERSION:string;
export declare const YEARS:readonly number[];
export declare const DATA_SHA256:string;
export declare const EVENTS:readonly (NaOJEvent & {epochMs:number})[];
export declare const AUDIT:{status:string;errors:readonly string[];records:number;matchedHkoCalendarDates:number;years:readonly number[];precision:'minute';independentChartFixtures:0;automaticallyPromotedPillars:0};
export declare function resolveNaOJJie(input:{instantIso:string}):NaOJResolution;
export declare function auditNaOJMinuteLedger(data:unknown,calendar?:unknown):typeof AUDIT;
