import type {BaziResearchInput,ResearchPillar} from './bazi-time-research.cjs';
export interface JieEvent {year:number;term:string;monthIndex:number;solarLongitudeDegrees:number;localHkt:string;instantUtc:string;}
export interface JieResolution {status:'RESOLVED'|'BOUNDARY_REVIEW'|'OUT_OF_COVERAGE';researchOnly:true;sourceId:string;instantUtc:string;active?:JieEvent|null;next?:JieEvent|null;boundary?:JieEvent;before?:JieEvent|null;after?:JieEvent;}
export declare const SOURCE_ID:string;
export declare const JIE_TERMS:readonly string[];
export declare const EVENTS:readonly (JieEvent&{epochMs:number})[];
export declare const COVERAGE:Readonly<{fromInclusive:string;untilExclusive:string;sourceId:string;years:readonly number[];guardSeconds:number;publishedPrecision:string;provenance:string}>;
export declare function resolveJieAt(input:{instantIso:string}):JieResolution;
export declare function evaluateWithReferenceJie(input:BaziResearchInput):{
 ruleSet:string;researchOnly:true;status:'PROVISIONAL'|'CLOCK_REVIEW'|'BOUNDARY_REVIEW'|'OUT_OF_COVERAGE';
 referenceJie:JieResolution;yearMonthPillars:{year:ResearchPillar;month:ResearchPillar}|null;
 pillars:{year:ResearchPillar|null;month:ResearchPillar|null;day:ResearchPillar;hour:ResearchPillar};
 dayMaster:{stem:string;element:string;polarity:string};relations:unknown;
 comparisonWithLegacy:null|{legacyPillars:{year:string;month:string};differs:readonly string[];legacyNearJie:boolean};
 clockStatus:string;note:string;solarYear?:number;monthIndex?:number;actualUtc?:string;
};
