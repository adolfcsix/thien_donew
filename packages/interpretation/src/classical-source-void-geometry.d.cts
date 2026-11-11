import type {AstrologyResult} from '@thiendo/shared-types';
export type ClassicalVoidGeometryStatus='matched'|'mismatched'|'unknown';
/** A two-branch geometric comparison; never identify the signs as the same stars. */
export interface ClassicalVoidPairGeometryAudit {
 readonly status:ClassicalVoidGeometryStatus;
 readonly reason:string;
 readonly comparisonScope:'unordered-branch-pair';
 readonly verifiedChartObstructions:boolean;
 readonly sourceFormulaConcordant:boolean;
 readonly pairGeometryConcordant:boolean|null;
 readonly yearStem:string|null;
 readonly chartTrietBranches:readonly string[];
 readonly sourceDoubleBranches:readonly string[];
 readonly sourceDoubleCodes:readonly number[];
 readonly sourcePlacementVerified:false;
 readonly sourceSchoolParityVerified:false;
 readonly sourceCriterionVerified:false;
 readonly nameEquivalenceVerified:false;
 readonly iztroPlacementVerified:false;
 readonly limitation:string;
}
export declare const LIMITATION:string;
export declare function auditClassicalVoidPairGeometry(chart:AstrologyResult):ClassicalVoidPairGeometryAudit;
