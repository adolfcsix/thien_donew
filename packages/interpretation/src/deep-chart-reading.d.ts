import type {AstrologyResult} from '@thiendo/shared-types';
export interface DeepEvidence {
 id:string;scope:'natal'|'annual';kind:string;star:string;palace:string;branch:string;branchIndex:number;
 relation:string;year?:number;strength?:string;transformation?:string;
}
export interface DeepParagraph {id:string;title:string;text:string;evidence:DeepEvidence[];status:string;}
export interface DeepTransformation {evidence:DeepEvidence;interpretation:string;caution:string;}
export interface DeepPalace {
 order:number;palace:string;branch:string;branchIndex:number;
 natal:{theme:string;tension:string;voChinhDieu:boolean;
  courts:{palace:string;branch:string;branchIndex:number;relation:string;isVoChinhDieu:boolean;
   groups:{main:{star:string;strength:string}[];support:{star:string}[];challenge:{star:string}[];transformation:{star:string;transformation:string}[];obstruction:{star:string}[]};
   issues:{category:string;star:string;reason:string}[];status:string}[];
  paragraphs:DeepParagraph[];relationships:{id:string;title:string;relation:string;evidence:DeepEvidence[];text:string}[];
  groups:{id:string;title:string;evidence:DeepEvidence[];text:string}[];
  otherSymbols:{evidence:DeepEvidence;motif:string;context:string;caution:string}[];
  transformations:DeepTransformation[];issues:{palace:string;branch:string;category:string;star:string;reason:string}[];
  status:string;question:string;counterexample:string;boundary:string};
 annual:{year:number;paragraph:DeepParagraph;markers:{name:string;branch:string;branchIndex:number;palace:string;relation:string}[];
  stars:DeepEvidence[];transformations:DeepTransformation[];rejected:{name:string|null;reason:string}[]};
}
export interface DeepChartReading {
 format:'thien-do.deep-chart-reading';schemaVersion:1;edition:'11.123.0';status:'editorial-unreviewed';expertReviewed:false;
 method:{description:string;natalRuleSet:string;natalTransformationRuleSet:string;annualRuleSet:string;annualTransformationRuleSet:string;tieuHanRuleSet:string;sourceRefs:{id:string;title:string;path:string}[]};
 year:number;canChi:string;ageMu:number;palaces:DeepPalace[];natalTransformations:DeepTransformation[];annualTransformations:DeepTransformation[];
 transformationLinks:{natal:DeepEvidence;annual:DeepEvidence;text:string}[];
 periods:{items:{name:string;scope:'period';branchIndex:number;branch:string;palace:string;fromAge?:number;toAge?:number;basis:string;interpretation:string;
  fourCourts:{branchIndex:number;palace:string;branch:string}[]}[];
  overlaps:{palace:string;branch:string;names:string[];text:string}[];issues:string[];beforeFirstDaiHan:boolean;daiHanStatus:'active'|'before-first'|'outside-range'|'needs-review';notice:string};
 summary:{palaces:12;reviewPalaces:number;natalTransformations:number;annualTransformations:number;annualStars:number};
 limitations:string[];notice:string;
}
export declare function buildDeepChartReading(chart:AstrologyResult,year:number):DeepChartReading;
