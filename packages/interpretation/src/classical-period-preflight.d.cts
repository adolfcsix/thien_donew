import type {AstrologyResult} from '@thiendo/shared-types';
export interface ClassicalPeriodPreflightRow {
 readonly index:number;
 readonly fromAge:number;
 readonly toAge:number;
 readonly branchIndex:number;
 readonly branchName:string;
 readonly palace:string;
 readonly locTonAndHorseInCourt:boolean;
 readonly sevenKillingInCourt:boolean;
 readonly sharpStarsAtPeriod:readonly string[];
}
export interface ClassicalPeriodCandidate {
 readonly id:'dinh-tap-01'|'dinh-tap-02'|'dinh-tap-03'|'dinh-tap-08';
 readonly sourceCriterionVerified:false;
 readonly scope:'period-research';
 readonly status:'partial-evidence';
 readonly sourceUrl:string;
}
export interface ClassicalPeriodPreflightReport {
 readonly geometryVerified:boolean;
 readonly natalLayersVerified:boolean;
 readonly sourceCriteriaVerified:false;
 readonly periods:readonly ClassicalPeriodPreflightRow[];
 readonly candidates:readonly ClassicalPeriodCandidate[];
 readonly reason:string;
}
export declare const PERIOD_IDS:readonly ClassicalPeriodCandidate['id'][];
export declare function auditClassicalPeriodPreflight(chart:AstrologyResult):ClassicalPeriodPreflightReport;
