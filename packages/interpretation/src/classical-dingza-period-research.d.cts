import type {AstrologyResult} from '@thiendo/shared-types';
export type DingZaCriterionState='met'|'not-met'|'unknown';
export interface DingZaCriterion {readonly label:string;readonly state:DingZaCriterionState;readonly detail:string;}
export interface DingZaPeriod {
 readonly index:number;readonly fromAge:number;readonly toAge:number;
 readonly branchIndex:number;readonly branchName:string;readonly palace:string;
 readonly checks:readonly DingZaCriterion[];
}
export interface DingZaResearchItem {
 readonly id:'dinh-tap-01'|'dinh-tap-02'|'dinh-tap-03'|'dinh-tap-08';
 readonly title:string;readonly status:'partial-evidence';readonly unit:'đại hạn';
 readonly sourceUrl:string;readonly sourceCriterionVerified:false;
 readonly periods:readonly DingZaPeriod[];
}
export interface DingZaPeriodResearch {
 readonly verifiedGeometry:boolean;readonly checkedPeriods:number;
 readonly sourceInterpretationVerified:false;readonly reason:string;
 readonly items:readonly DingZaResearchItem[];
}
export declare const IDS:readonly string[];
export declare const SOURCE:string;
export declare function auditClassicalDingZaPeriods(chart:AstrologyResult):DingZaPeriodResearch;
