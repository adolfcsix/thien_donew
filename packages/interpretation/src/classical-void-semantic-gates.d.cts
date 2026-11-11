import type {AstrologyResult} from '@thiendo/shared-types';
export type ClassicalVoidGateState='met'|'not-met'|'unknown';
export interface ClassicalVoidGateCheck {
 readonly label:string;
 readonly state:ClassicalVoidGateState;
 readonly detail:string;
}
export interface ClassicalVoidCandidate {
 readonly id:'dinh-ban-01'|'dinh-ban-02'|'dinh-tap-03';
 readonly scope:'natal-research'|'period-research';
 readonly sourceUrl:string;
 readonly sourcePlacementVerifiedForCurrentChart:false;
 readonly sourceCriterionVerified:false;
 readonly semanticEquivalenceVerified:false;
 readonly sampleGeometryEvidenceOnly:true;
 readonly sourceSampleCount:65;
 readonly sourceCommit:string;
 readonly limitation:string;
 readonly checks:readonly ClassicalVoidGateCheck[];
}
export interface ClassicalVoidSemanticGateAudit {
 readonly ids:readonly ('dinh-ban-01'|'dinh-ban-02'|'dinh-tap-03')[];
 readonly verifiedLocalObstructions:boolean;
 readonly trietSourcePairGeometryStatus:'matched'|'mismatched'|'unknown';
 readonly proxyBranches:readonly number[];
 readonly sourceCriterionVerified:false;
 readonly semanticEquivalenceVerified:false;
 readonly sourcePlacementVerifiedForCurrentChart:false;
 readonly sourceSampleCount:65;
 readonly limitation:string;
 readonly items:readonly ClassicalVoidCandidate[];
}
export declare const IDS:readonly ('dinh-ban-01'|'dinh-ban-02'|'dinh-tap-03')[];
export declare const SOURCE_PIN:string;
export declare const SOURCE_PERIOD:string;
export declare const LIMITATION:string;
export declare function auditClassicalVoidSemanticGates(chart:AstrologyResult):ClassicalVoidSemanticGateAudit;
