import type {ClassicalPatternCandidate} from './classical-pattern-research.cjs';
export type ClassicalEvidenceFilter='relevant'|'matched'|'review'|'not-met'|'all';
export interface ClassicalCriterionCounts {
 readonly total:number;
 readonly met:number;
 readonly notMet:number;
 readonly unknown:number;
}
export interface ClassicalEvidenceCounts {
 readonly all:number;
 readonly relevant:number;
 readonly matched:number;
 readonly review:number;
 readonly notMet:number;
}
export interface ClassicalEvidenceOverview {
 readonly counts:ClassicalEvidenceCounts;
 readonly byId:Readonly<Record<string,ClassicalCriterionCounts>>;
}
export declare const FILTERS:readonly ClassicalEvidenceFilter[];
export declare function summarizeChecks(record:ClassicalPatternCandidate):ClassicalCriterionCounts;
export declare function summarizeClassicalEvidence(records:readonly ClassicalPatternCandidate[]):ClassicalEvidenceOverview;
export declare function filterClassicalEvidence(records:readonly ClassicalPatternCandidate[],filter?:ClassicalEvidenceFilter):readonly ClassicalPatternCandidate[];
