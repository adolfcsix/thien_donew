export interface ClassicalVoidGapCount {
 readonly met:number;
 readonly notMet:number;
 readonly unknown:number;
}
export type ClassicalVoidGapId='dinh-ban-01'|'dinh-ban-02'|'dinh-tap-03';
export interface ClassicalVoidGapItem {
 readonly id:ClassicalVoidGapId;
 readonly title:string;
 readonly scope:'natal-research'|'period-research';
 readonly sourceUrl:string;
 readonly blocker:string;
 readonly localChecks:ClassicalVoidGapCount;
 readonly proxyChecks:ClassicalVoidGapCount;
 readonly checkedPeriods:number;
 readonly sourceGate:Readonly<{id:'source-void-semantics';status:'unknown';note:string}>;
 readonly sourceCriterionVerified:false;
 readonly expertReviewed:false;
 readonly readyForMapping:false;
 readonly status:'needs-source-verification';
}
export interface ClassicalVoidGapLedger {
 readonly schema:'thiendo-r43-void-gap-ledger-v1';
 readonly summary:Readonly<{
  referenceTotal:49;
  mappedConditionResearch:31;
  unmapped:18;
  pending:3;
  disputed:9;
  unreachable:6;
  semanticVerified:0;
 }>;
 readonly items:readonly ClassicalVoidGapItem[];
 readonly sourceCommit:string;
 readonly chartPolicyChanged:false;
 readonly mayDeclarePattern:false;
 readonly mayIncreaseMapping:false;
 readonly notice:string;
}
export declare const TARGET_IDS:readonly ClassicalVoidGapId[];
/** Each argument is an already-audited report; the implementation fail-closes on mismatch. */
export declare function buildClassicalVoidGapLedger(args:{
 readonly catalog:unknown;
 readonly readiness:unknown;
 readonly natal:unknown;
 readonly period:unknown;
 readonly voidGates:unknown;
}):ClassicalVoidGapLedger;
