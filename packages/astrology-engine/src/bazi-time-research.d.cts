export type TimeMode='civil'|'mean-solar'|'apparent-solar';
export type DayBoundary='midnight'|'late-zi';
export interface BaziResearchInput {
  date:string;hour:number;minute?:number;utcOffsetMinutes:number;longitudeDeg:number;
  timeMode?:TimeMode;dayBoundary?:DayBoundary;
}
export interface SolarTimeCorrection {
  meridianDeg:number;unwrappedLongitudeDeg:number;longitudeCorrectionMinutes:number;
  equationOfTimeMinutes:number;correctionMinutes:number;
}
export interface ResearchPillar {stem:string;branch:string;stemIndex:number;branchIndex:number;name:string;tenGod:string|null;hiddenStems:unknown[]}
export interface BaziResearchResult {
  ruleSet:string;researchOnly:true;status:'REVIEW_REQUIRED'|'PROVISIONAL';
  input:Required<BaziResearchInput>;
  timestamps:{localCivil:string;utc:string;effective:string};
  timeCorrection:SolarTimeCorrection;
  yearMonthSource:string;dayHourSource:string;
  pillars:{year:ResearchPillar;month:ResearchPillar;day:ResearchPillar;hour:ResearchPillar};
  dayMaster:{stem:string;element:string;polarity:string};
  relations:unknown;
  solarTerm:{longitudeDeg:number;JieBoundaryStatus:string;jieArcDistanceDeg:number};
  boundaryCheck:{dayDistanceMinutes:number;hourDistanceMinutes:number;withinFiveMinutes:boolean;nearJie:boolean};
  notes:readonly string[];scope:string;disclaimer:string;
}
export declare const RULESET:string;
export declare const MODES:readonly TimeMode[];
export declare const DAY_BOUNDARIES:readonly DayBoundary[];
export declare const SCOPE:string;
export declare function assertInput(input:BaziResearchInput):unknown;
export declare function equationOfTimeNoaa(utcMs:number):number;
export declare function solarTimeCorrection(input:{utcMs:number;utcOffsetMinutes:number;longitudeDeg:number;timeMode:TimeMode}):SolarTimeCorrection;
export declare function evaluate(input:BaziResearchInput):BaziResearchResult;
export declare function compareConventions(input:BaziResearchInput):{
  ruleSet:string;researchOnly:true;
  cases:readonly {timeMode:TimeMode;dayBoundary:DayBoundary;status:string;pillars:Readonly<Record<'year'|'month'|'day'|'hour',string>>;effective:string;correctionMinutes:number}[];
  differingPillars:readonly ('year'|'month'|'day'|'hour')[];warning:string;
};
