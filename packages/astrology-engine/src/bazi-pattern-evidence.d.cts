export type PatternEvidenceStatus='BLOCKED'|'PROVISIONAL'|'REVIEW_REQUIRED';
export type PatternBranchGroup={kind:'TAM_HOP'|'TAM_HOI';branches:readonly string[];pillars:readonly string[];symbolicElement:string;includesMonth:boolean;clashEvidence:readonly {pillars:readonly string[];branches:readonly string[]}[];transformed:false;status:'CONFLICT_REVIEW'|'COMPLETE_SYMBOLS_ONLY'};
export interface BaziPatternEvidence {
 ruleSet:string;researchOnly:true;status:PatternEvidenceStatus;reason:string|null;seasonStatus:string;
 monthBranch:string|null;
 exposure:readonly {stem:string;stemIndex:number;qi:'main'|'secondary'|'residual';tenGod:string;exposedAt:readonly string[];isDayMasterOnly:boolean;monthPillarExposed:boolean;outsideMonthExposed:boolean}[];
 branchGroups:readonly PatternBranchGroup[];
 stemContacts:readonly {kind:string;pillars:readonly string[];stems:readonly string[];symbolicElement:string|null;transformed:false}[];
 branchContacts:readonly {kind:string;pillars:readonly string[];branches:readonly string[];transformed:false}[];
 possibleTransformations:readonly {mechanism:string;candidateStems?:readonly string[];candidateElements?:readonly string[];status:'CANDIDATE_ONLY';reason:string}[];
 methodChecks:readonly {id:string;observation:string;evidence:readonly string[];verdict:'UNDETERMINED'}[];
 pendingConditions:readonly string[];notes:readonly string[];
 decision:{pattern:null;formation:null;breakage:null;dayMasterStrength:null;usefulGod:null;reason:string};
}
export declare const RULESET:string;
export declare const PILLARS:readonly string[];
export declare const SEASONAL_MEETINGS:readonly {branches:readonly number[];element:string}[];
export declare function buildPatternEvidence(chart:Record<string,unknown>):BaziPatternEvidence;
export declare function evaluatePatternEvidence(input:Record<string,unknown>):BaziPatternEvidence;
