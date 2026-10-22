export type Phase2ResearchStatus='PROVISIONAL'|'REVIEW_REQUIRED'|'BLOCKED';
export type TenGodFamily='companion'|'resource'|'output'|'wealth'|'authority';
export interface HiddenStemEvidence {stem:string;stemIndex:number;element:string;tenGod:string;family:TenGodFamily;qi:'main'|'secondary'|'residual';order:number;}
export interface ExposedStemEvidence extends HiddenStemEvidence {exposedAt:readonly ('year'|'month'|'day'|'hour')[];exposedBeyondMonth:boolean;}
export interface SeasonEvidence {
 ruleSet:string;researchOnly:true;status:Phase2ResearchStatus;reason:string|null;
 dayMaster:null|{stem:string;stemIndex:number;element:string;polarity:string};
 monthCommand:null|{branch:string;branchIndex:number;solarTerm:string;sourceId:string;principalQi:ExposedStemEvidence;
 hiddenCandidates:readonly ExposedStemEvidence[];mainQiSupportsDayMaster:boolean;visibleCandidateCount:number;unresolved:string};
 visibleTenGods:readonly {pillar:string;stem:string;stemIndex:number;tenGod:string;family:TenGodFamily}[];
 hiddenByPillar:readonly {pillar:string;branch:string;branchIndex:number;stems:readonly HiddenStemEvidence[]}[];
 rootEvidence:readonly {pillar:string;branch:string;dayElementRoot:boolean;exactStemRoot:boolean;supportingHidden:readonly string[]}[];
 visibleSupport:readonly {pillar:string;stem:string;stemIndex:number;tenGod:string;family:TenGodFamily}[];
 supportCounts?:{visibleStemSupport:number;distinctRootBranches:number;monthlyMainQiSupports:boolean};
 methodComparisons:readonly {id:string;status:string;evidence:readonly string[];limitation:string}[];
 notes:readonly string[];decision?:{dayMasterStrength:null;pattern:null;usefulGod:null;reason:string};
}
export declare const RULESET:string;
export declare function evaluateSeasonEvidence(input:Record<string,unknown>):SeasonEvidence;
export declare function buildSeasonEvidence(chart:Record<string,unknown>):SeasonEvidence;
