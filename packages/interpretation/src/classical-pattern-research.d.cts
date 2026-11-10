import type {AstrologyResult} from '@thiendo/shared-types';

export type ClassicalCriterionStatus='met'|'not-met'|'unknown';
export type ClassicalPatternStatus='structural-match'|'not-met'|'needs-review';
export interface ClassicalCriterion {
  label:string;
  state:ClassicalCriterionStatus;
  detail:string;
}
export interface ClassicalPatternCandidate {
  id:string;
  title:string;
  group:'Định phú'|'Định quý';
  reference:string;
  sourceUrl:string;
  status:ClassicalPatternStatus;
  checks:ClassicalCriterion[];
  interpretation:string;
  extra:string;
  expertReviewed:false;
  caution:string;
}
export interface ClassicalResearchGroup {
  name:string;
  totalInReference:number;
  implementedHere:number;
  scope:string;
}
export interface ClassicalPatternResearch {
  edition:'thiendo-classical-research-2026-11-10-r5';
  scope:'natal-only';
  groups:readonly ClassicalResearchGroup[];
  referenceTotal:49;
  assessed:number;
  matched:number;
  needsReview:number;
  records:readonly ClassicalPatternCandidate[];
  expertReviewed:false;
  notice:string;
}
export declare const SOURCE:string;
export declare const SOURCE_COMMIT:'7922285d947b36610e7e31c232d8f1e2a0d0871d';
export declare const GROUPS:readonly ClassicalResearchGroup[];
export declare function auditClassicalPatternCandidates(chart:AstrologyResult):ClassicalPatternResearch;
