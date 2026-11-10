import type {AstrologyResult} from '@thiendo/shared-types';
export interface SchoolBrightnessRecord {
 readonly name:string;
 readonly branchIndex:number;
 readonly branchName:string;
 readonly sourceStarId:number;
 readonly level:number;
 readonly label:string;
 readonly isMiaoWang:boolean;
 readonly profile:string;
 readonly sourceUrl:string;
 readonly sourceCommit:string;
}
export interface SchoolBrightnessConflict {
 readonly code:string;
 readonly unresolved:true;
 readonly detail:string;
 readonly alternateUrl:string;
}
export interface LinhBrightnessRow {
 readonly branchIndex:number;
 readonly branchName:string;
 readonly qsLabel:string;
 readonly defaultLabel:string;
 readonly differs:boolean;
}
export interface LinhSchoolReconciliation {
 readonly sourceUrl:string;
 readonly alternateUrl:string;
 readonly sourceCommit:string;
 readonly baseSchool:'SB_QS';
 readonly alternativeSchool:string;
 readonly totalBranches:12;
 readonly differenceCount:number;
 readonly differingBranches:readonly string[];
 readonly rows:readonly LinhBrightnessRow[];
 readonly differences:readonly LinhBrightnessRow[];
 readonly sourceOrder:'Dần-first to Tý-first';
 readonly adopted:false;
 readonly expertReviewed:false;
 readonly note:string;
}

export interface ThienDoBrightnessRecord {
 readonly branchIndex:number;
 readonly status:string;
 readonly label:string;
 readonly source:string;
 readonly ruleSet:string;
}
export interface BrightnessComparison {
 readonly profile:string;
 readonly sourceUrl:string;
 readonly sourceCommit:string;
 readonly discrepancy:SchoolBrightnessConflict;
 readonly linhReconciliation:LinhSchoolReconciliation;
 readonly interpretationOnly:true;
 readonly expertReviewed:false;
 readonly confidence:'school-comparison-not-adopted';
 readonly available:boolean;
 readonly tham:SchoolBrightnessRecord|null;
 readonly fire:SchoolBrightnessRecord|null;
 readonly bell:SchoolBrightnessRecord|null;
 readonly thienDoTham:ThienDoBrightnessRecord|null;
 readonly chartLinhComparison:LinhBrightnessRow|null;
 readonly mayConfirmClassicalPattern:false;
 readonly reason:string;
}
export declare const PROFILE:string;
export declare const REF_COMMIT:'7922285d947b36610e7e31c232d8f1e2a0d0871d';
export declare const SOURCE_URL:string;
export declare const CROSSCHECK_URL:string;
export declare const BRANCHES:readonly string[];
export declare const ROWS:Readonly<Record<string,readonly number[]>>;
export declare const LABELS:Readonly<Record<number,string>>;
export declare const discrepancy:SchoolBrightnessConflict;
export declare const DEFAULT_LINH_DAN_FIRST:readonly string[];
export declare const DEFAULT_LINH_TY_FIRST:readonly string[];
export declare const linhReconciliation:LinhSchoolReconciliation;
export declare function lookupQS(name:string,branchIndex:number):SchoolBrightnessRecord|null;
export declare function compareQSBrightness(chart:AstrologyResult,fireAudit:unknown,thamPosition:unknown,thamStrength:unknown):BrightnessComparison;
