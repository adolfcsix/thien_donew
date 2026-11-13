import type {ClassicalCatalogReport} from './classical-pattern-catalog.cjs';
import type {ClassicalResearchReadiness} from './classical-research-readiness.cjs';
export interface ClassicalResearchMilestone {
  readonly schema:string;
  readonly sourceCommit:string;
  readonly total:number;
  readonly conditionMapped:number;
  readonly mappedByScope:Readonly<{natal:number;period:number}>;
  readonly remaining:Readonly<{mapped:number;pending:number;disputed:number;unreachable:number;unmapped:number}>;
  readonly sourceCandidatesStillDerivable:number;
  readonly nextCandidates:readonly Readonly<{
    id:string;title:string;scope:string;sourceUrl:string;blocker:string;
    requiredChecks:readonly string[];sourceRuleVerifiedForLocalChart:false;
    semanticEquivalenceVerified:false;readyToPromote:false;
  }>[];
  readonly expertConfirmed:0;
  readonly sourceSchoolParityVerified:false;
  readonly semanticEquivalenceVerified:false;
  readonly mayRaiseMilestone:false;
  readonly chartResultIndependent:true;
  readonly note:string;
}
export declare const PENDING:readonly string[];
export declare const REVIEW_GATES:Readonly<Record<string,readonly string[]>>;
export declare function summarizeClassicalResearchMilestone(input:{
  natal:{assessed:number;referenceTotal:number;records:readonly unknown[];expertReviewed:boolean};
  bridge:{mappedIds:readonly string[];sourceCriterionVerified:boolean;schoolPlacementVerified:boolean};
  catalog:ClassicalCatalogReport;
  readiness:ClassicalResearchReadiness;
}):ClassicalResearchMilestone;
