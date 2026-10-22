import type {AstrologyResult} from '@thiendo/shared-types';
export type PeriodTimelineYear = {
  year:number;canChi:string;ageMu:number;
  daiHan:null|{branchIndex:number;palace:string;fromAge:number;toAge:number};
  tieuHan:{branchIndex:number;palace:string;branch:string};
  luuThaiTue:{branchIndex:number;branch:string};
  annualStarCount:number;annualTransformationCount:number;
  overlaps:{branchIndex:number;label:string}[];
};
export type PeriodTimeline = {
  ruleSet:string;selectedYear:number;birthLunarYear:number;years:PeriodTimelineYear[];
  selected:PeriodTimelineYear;
  annualTrace:{method:string;selectedLunarYear:number;yearStem:string;yearBranch:string;
    counts:{annualStars:number;annualTransformations:number;unresolvedNames:number;unresolvedAliases:number};researchOnly:true;expertReviewed:false};
  houses:{branchIndex:number;branch:string;palace:string;labels:string[];annualStars:string[];
    annualTransformations:{name:string;star:string}[];
    natalStarCount:number;natalGroups:{key:string;label:string;names:string[]}[];
    natalCycles:{key:string;label:string;names:string[]}[];
    annualStudy:{name:string;theme:string;question:string;expertReviewed:false}[];
    periodQuestions:{label:string;text:string}[];
    annualEvidence:({kind:'annual-star';name:string;branchIndex:number;palace:string;inputLayer:string;inputKind:string;inputValue:string;ruleSet:string;expertReviewed:false}|{kind:'annual-transformation';name:string;hostStar:string;branchIndex:number;palace:string;inputLayer:string;inputKind:string;inputValue:string;ruleSet:string;hostStarOrigin:string;expertReviewed:false})[];
    editorialReviewed:false;}[];
  natalInventory:{placedNameOccurrences:number;layersSeparate:true;expectedBaselineNameCount:number;fullStarSchoolCoverageVerified:false};
  editorial:{edition:string;expertReviewed:false;schoolVerified:false;description:string};
  coverage:{daiHan:boolean;tieuHan:boolean;luuThaiTue:boolean;annualStars:number;annualTransformations:number;luuNguyet:boolean;luuNhat:boolean;luuThoi:boolean;fullLuuNien:boolean};
  explanation:string;limitation:string;
};
export declare const RULESET:string;
export declare function comparePeriods(chart:AstrologyResult,selectedYear:number,range?:number):PeriodTimeline;
