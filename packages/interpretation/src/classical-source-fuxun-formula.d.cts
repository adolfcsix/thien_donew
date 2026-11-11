/** R26: source-only placement formula, never verified natal star location. */
export interface ClassicalFuxunSourceProjection {
 readonly inputKind:'source-xunkong-branch-index';
 readonly primaryName:'旬空';
 readonly partnerName:'副旬';
 readonly primaryBranchIndex:number;
 readonly partnerBranchIndex:number;
 readonly primaryBranch:string;
 readonly partnerBranch:string;
 readonly sourceFormulaReproduced:true;
 readonly sourceXunkongPlacementVerified:false;
 readonly iztroPlacementVerified:false;
 readonly sourceSchoolParityVerified:false;
 readonly natalChartParityVerified:false;
 readonly sourceCriterionVerified:false;
 readonly sourceUrl:string;
 readonly caution:string;
}
export interface ClassicalFuxunSourcePair {
 readonly branches:readonly string[];
 readonly branchIndices:readonly number[];
 readonly primaryIfEven:string;
 readonly partnerIfEven:string;
 readonly sourceXunkongPlacementVerified:false;
}
export declare const SOURCE_URL:string;
export declare const CAUTION:string;
export declare const SOURCE_FUXUN_PAIRS:readonly ClassicalFuxunSourcePair[];
export declare function projectSourceFuxunPartner(xunkongBranchIndex:number):ClassicalFuxunSourceProjection|null;
