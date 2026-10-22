export interface FourTransformation {
  type: 'Hóa Lộc'|'Hóa Quyền'|'Hóa Khoa'|'Hóa Kỵ';
  star:string;stem:string;stemIndex:number;profileId:string;profileStatus:string;
}
export interface PalacePlacement {
  branchIndex:number; stem:number|string;palace?:string;stars:string[];auxiliaryStars:string[];
}
export interface PhiHoaFlight extends FourTransformation {
  scope:'palace-stem'|'birth-year'|'annual-year';sourceBranchIndex:number|null;
  targetBranchIndex:number|null;targetPalace:string|null;
  status:'located'|'unresolved';reason:string|null;selfTransformation:boolean;oppositePalace:boolean;
}
export declare const STEMS:readonly string[];
export declare const TYPES:readonly string[];
export declare const DEFAULT_PROFILE:'toan-tap-common';
export declare const PROFILES:Readonly<Record<string,{title:string;status:string;rows:readonly (readonly string[])[]}>>;
export declare function parseStem(stem:string|number):number;
export declare function lookupFour(stem:string|number,profileId?:string):readonly FourTransformation[];
export declare function buildFlights(args:{palaces:PalacePlacement[];scope:'palace-stem'|'birth-year'|'annual-year';sourceBranchIndex?:number|null;sourceStem?:string|number|null;profileId?:string}):{
  ruleSet:string;scope:string;profileId:string;profileStatus:string;sourceStem:string;sourceStemIndex:number;sourceBranchIndex:number|null;flights:readonly PhiHoaFlight[];complete:boolean;researchOnly:true;disclaimer:string;
};
export declare function compareProfiles(leftId:string,rightId:string):{leftId:string;rightId:string;changes:readonly {stem:string;type:string;left:string;right:string}[];count:number;researchOnly:true};
