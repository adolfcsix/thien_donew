import type {AstrologyResult} from '@thiendo/shared-types';
export interface DingZaSourceCriterion {readonly label:string;readonly state:'met'|'not-met'|'unknown';readonly detail:string;}
export interface DingZaSourcePeriod {readonly index:number;readonly fromAge:number;readonly toAge:number;readonly branchIndex:number;readonly checks:readonly DingZaSourceCriterion[];}
export interface DingZaSourceItem {readonly id:'dinh-tap-01'|'dinh-tap-08';readonly status:'mapped-condition-research';readonly sourceCriterionVerified:false;readonly sourcePlacementVerified:false;readonly unit:'đại hạn';readonly sourceUrl:string;readonly periods:readonly DingZaSourcePeriod[];}
export interface DingZaSourceReport {
 readonly mappedIds:readonly ('dinh-tap-01'|'dinh-tap-08')[];
 readonly sourceUrl:string;readonly sourceCriterionVerified:false;
 readonly schoolPlacementVerified:false;readonly sourceProfileReady:boolean;
 readonly reason:string;readonly schoolDifferences:readonly number[];
 readonly items:readonly DingZaSourceItem[];
}
export declare const SOURCE_COMMIT:string;
export declare const SOURCE_URL:string;
export declare const NAMES:readonly string[];
export declare const SOURCE_MATRIX:Readonly<Record<string,readonly number[]>>;
export declare const MAPPED_IDS:readonly ('dinh-tap-01'|'dinh-tap-08')[];
export declare function lookupSourceMainStrength(name:string,branch:number):
 Readonly<{name:string;branch:number;raw:number;weak:boolean;strong:boolean;sourceUrl:string;placementParityVerified:false}>|null;
export declare function auditClassicalDingZaSourceBridge(chart:AstrologyResult):DingZaSourceReport;
