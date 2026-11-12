export interface SourceStar {readonly name:string;readonly siHua?:'禄'|'权'|'科'|'忌'}
export interface SourceFixture {
 readonly kind:'source-synthetic-fixture';
 readonly palaces:readonly {readonly branch:number;readonly stars:readonly SourceStar[]}[];
 readonly mingGongBranch:number;
 readonly periodBranches:readonly number[];
}
export interface SourcePeriod {
 readonly index:number;readonly branch:number;
 readonly sevenKillingsInFourCourts:boolean;
 readonly locAndHorseEachAtSourceVoid:boolean;
 readonly formulaMatched:boolean;
}
export interface SourceResult {
 readonly schema:'thiendo-r44-source-void-fixture-v1';
 readonly sourceCommit:string;
 readonly sourceVoidNames:readonly string[];
 readonly mappedConditionResearch:31;
 readonly referenceTotal:49;
 readonly items:readonly {readonly id:string;readonly formulaMatched:boolean;readonly periods:readonly SourcePeriod[];readonly sourceUrl:string;readonly sourceEnginePlacementVerified:false;readonly parityWithThienDoVerified:false;readonly mayDeclarePattern:false}[];
 readonly sourceEnginePlacementVerified:false;
 readonly parityWithThienDoVerified:false;
 readonly mayDeclarePattern:false;
 readonly mayIncreaseMapping:false;
 readonly notice:string;
}
export declare const VOID:readonly string[];
export declare const IDS:readonly string[];
export declare function evaluatePinnedSourceVoidFixture(input:SourceFixture):SourceResult;
