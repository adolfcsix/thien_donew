/** V11.70: evaluated editorial predicates. Never asserts a verified classical formation. */
export interface ConditionalPatternPosition {
 star:string;branchIndex:number;palace:string;branch:string;relation:string;isMainStar:boolean;
 strength:string|null;mainStars:string[];obstructions:string[];
}
export interface ConditionalPatternRecord {
 id:string;title:string;kind:'same-palace'|'natal-transformation'|'inter-palace';scope:string;required:string[];
 status:'matched'|'partial'|'unmet'|'needs-review';observed:ConditionalPatternPosition[];
 excluded:{star:string;reason:string;detail:string;positions:number[]}[];
 conditions:{label:string;met:boolean}[];interpretation:string;caution:string;classification:'editorial-position-only';
}
export interface ConditionalPatternEvidence {
 edition:'11.70.0';scope:'natal-conditional-evidence';anchorBranchIndex:number;palace:string;
 assessed:number;matched:number;partial:number;needsReview:number;records:ConditionalPatternRecord[];
 expertReviewed:false;notice:string;
}
export declare function evidenceForConditionalPatterns(chart:AstrologyResult,branchIndex:number):ConditionalPatternEvidence;

export interface NatalPairPlacement {
  star:string;status:'observed'|'ambiguous'|'absent';branches:number[];
  branchIndex?:number;branch?:string;palace?:string;layers?:string[];
}
export interface NatalPairStudy {
  edition:string;scope:'natal-pair-study';anchorBranchIndex:number;
  assessed:number;matched:number;ambiguous:number;expertReviewed:false;notice:string;
  records:{id:string;title:string;category:string;stars:string[];
    status:'matched'|'ambiguous'|'not-observed'|'outside-scope';
    relation:'dong-cung'|'tam-hop'|'doi-cung'|'giap-cung'|null;
    relationLabel:string|null;placements:NatalPairPlacement[];
    question:string;nextStep:string;classification:'positional-study-only';expertReviewed:false}[];
}
export declare function diagnoseNatalStarPairs(chart:AstrologyResult,branchIndex:number):NatalPairStudy;
export interface NatalMultiStarPlacement {
  star:string;status:'observed'|'ambiguous'|'absent';branches:number[];inFourCourts:boolean;
  branchIndex?:number;branch?:string;palace?:string;layers?:string[];
  relation?:'Tọa cung'|'Tam hợp'|'Đối cung'|'Ngoài Tứ chính';accompanyingMainStars?:string[];
}
export interface ConditionalStarGroupGuide {
 id:string;title:string;category:string;status:'complete'|'partial'|'insufficient'|'needs-review';
 required:number;observed:number;stars:string[];
 evidence:{star:string;branchIndex:number;palace:string;branch:string;relation:string;accompanyingMainStars:string[]}[];
 excluded:{star:string;reason:'absent'|'outside'|'ambiguous'|'repeated'|'inconsistent';explanation:string;branchIndex?:number;palace?:string;relation?:string}[];
 samePalacePairs:{stars:string[];palace:string;branchIndex:number}[];
 referenceCases:{status:'complete'|'partial';date:string;gender:string;hour:number;anchorPalace:string;
  expectedEvidence:{star:string;branchIndex:number;relation:string}[];expectedExcluded:{star:string;reason:string}[]}[];
 focusAngle:string;example:string;workedFull:string;workedPartial:string;counterexample:string;practice:string;boundary:string;observedNarrative:string;
 conditions:{scope:'natal-four-courts';requiresAll:string[];allConditionsMet:boolean;doesNotConfirmClassicalFormation:true};
 classification:'editorial-conditional-study-only';expertReviewed:false;
}
export interface ConditionalStarGroupGuides {
 edition:string;scope:'natal-four-court-conditional-study';anchorBranchIndex:number;
 expertReviewed:false;assessed:number;complete:number;partial:number;needsReview:number;
 records:ConditionalStarGroupGuide[];notice:string;
}
export declare function buildConditionalStarGroupGuides(chart:AstrologyResult,branchIndex:number,records:NatalMultiStarStudy['records']):ConditionalStarGroupGuides;
export interface NatalMultiStarStudy {
  edition:string;scope:'natal-multi-star-study';anchorBranchIndex:number;
  assessed:number;allObserved:number;partial:number;ambiguous:number;expertReviewed:false;notice:string;
  records:{id:string;title:string;category:string;question:string;nextStep:string;stars:string[];
    status:'all-observed'|'partial'|'ambiguous'|'insufficient';required:number;observed:number;
    placements:NatalMultiStarPlacement[];classification:'positional-study-only';expertReviewed:false}[];
  conditionalGuides:ConditionalStarGroupGuides;
  transformations:{name:string;target:string|null;branchIndex:number;palace:string;relation:string;status:string}[];
  rejectedTransformations:NatalMultiStarStudy['transformations'];
  annualOverlay:null|{year:number;scope:'annual-only';stars:{name:string;branchIndex:number;palace:string}[];
    transformations:{name:string;target:string|null;branchIndex:number;palace:string}[];notice:string};
}
export declare function examineNatalMultiStars(chart:AstrologyResult,branchIndex:number,options?:{annual?:AnnualOverview|null;includeAnnual?:boolean}):NatalMultiStarStudy;
export interface FourCourtStarEvidence {star:string;status:'observed'|'not-observed'|'ambiguous';reason:string;positions:number[];branchIndex:number|null;layers:string[];branch?:string;palace?:string;relation?:string;}
export interface FourCourtStudyGuide {
  familyId:string;title:string;focus:string;studySteps:string[];
  cases:{id:string;title:string;question:string;action:string;observations:string[];status:'editorial-question'}[];
  evidenceSummary:{requiredObserved:number;requiredTotal:number;missing:string[];unknownStrengths:string[];rejectedTransformations:number};
  studyOnly:true;expertReviewed:false;notice:string;
}
/** V11.63: audited multi-layer editorial review; never certification of cách cục. */
/** V11.64: optional geometry comparison; editorial hypotheses, NOT verified schools. */
export interface ClassicalPositionLenses {
 familyId:string;scope:'editorial-position-lenses';edition:'11.64.0';
 question:string;counterexample:string;
 comparison:{eligible:number;total:number};
 tests:{id:'four-court'|'triad-only'|'focus-anchored';label:string;geometry:string;
   explanation:string;status:'data-needs-review'|'geometry-not-met'|'geometry-only-needs-strength'|'geometry-observed';
   geometryMatches:boolean;observed:{star:string;branchIndex:number;relation:string;palace:string}[];
   outside:string[];notObserved:string[];anchorMissing:string[];reasons:string[];
   expertReviewed:false;confirmedClassicalFormation:false}[];
 contextSignals:{obstructions:string[];verifiedHoaKy:(string|null)[];strengthIncomplete:boolean;transformationConflicts:number};
 schoolStatus:'unreviewed';expertReviewed:false;confirmedClassicalFormation:false;notice:string;
}
export interface ClassicalReviewMatrix {
 schoolLenses:ClassicalPositionLenses;
 id:string;title:string;scope:'natal-four-courts-editorial';edition:string;
 status:'needs-review'|'conditions-not-met'|'incomplete-evidence'|'qualified-candidate'|'structural-candidate';
 structuralCriteriaMet:boolean;
 required:{star:string;status:string;reason:string;branchIndex:number|null;relation:string|null;palace:string|null;strength:string|null}[];
 checks:{id:string;label:string;met:boolean;detail:string}[];
 blockers:{id:string;detail:string}[];
 qualifiers:{kind:string;name:string;branchIndex:number;palace:string;relation:string;explanation:string}[];
 natalTransformations:{name:string;target:string|null;branchIndex:number;palace:string;relation:string}[];
 rejectedTransformations:number;supportCount:number;
 focusQuestion:string;interpretiveFrame:string;counterexample:string;practice:string;
 schoolStatus:'unreviewed';expertReviewed:false;confirmedClassicalFormation:false;notice:string;
}
export interface FourCourtEvidence {
  scope:'natal-four-courts';anchorBranchIndex:number;branches:number[];
  required:FourCourtStarEvidence[];supports:FourCourtStarEvidence[];review:FourCourtStarEvidence[];
  strengths:{star:string;status:'M'|'V'|'D'|'B'|'H'|null;reason:string;branchIndex:number|null}[];
  transformations:{name:string;target:string|null;branchIndex:number;palace:string;relation:string;status:'verified-natal-target'|'unverified-target'}[];
  rejectedTransformations:FourCourtEvidence['transformations'];
  obstructions:{marker:'Tuần'|'Triệt';branchIndex:number;palace:string;relation:string}[];
  flags:{missingRequired:boolean;missingStrengthData:boolean;ambiguousEvidence:boolean;containsHoaKy:boolean;hasObstruction:boolean};
  summary:{requiredObserved:number;requiredTotal:number;supportsObserved:number;reviewObserved:number;transformationsVerified:number;strengthsKnown:number};
  expertConfirmed:false;notice:string;
}
import type {AstrologyResult,AstrologyHouse,AnnualOverview} from '@thiendo/shared-types';
export interface StarReading {
  name:string;motif:string|null;explanation:string|null;strength:string|null;caution:string|null;
}
/** Evidence-backed editorial note. Never a verified prediction or classical rule. */
export interface PrimaryPalaceContext {
  star:string;palace:string;branch:string;
  focus:string;potential:string;tradeoff:string;reflection:string;
  evidence:{
    tọaCung:{branchIndex:number;palace:string;star:string};
    strength:{code:'M'|'V'|'D'|'B'|'H'|null;label:string;confirmedByExpert:false};
    samePalaceMainStars:string[];samePalaceSupportingStars:string[];
    natalTransformations:string[];obstructionMarkers:string[];
    tamHop:{branchIndex:number;palace:string;branch:string;mainStars:string[]}[];
    opposite:{branchIndex:number;palace:string;branch:string;mainStars:string[]};
  };
  quality:{status:string;source:string;expertReviewed:false;independentValidation:false;
    natalOnly:true;hasExplicitMainStarPlacement:true};
}
export declare function buildPrimaryPalaceContext(chart:AstrologyResult,branchIndex:number):PrimaryPalaceContext[];

export interface AnnualEvidenceItem {
  name:string;branchIndex:number;palace:string;relation:string;inFourCourts:boolean;source:'annual-only';
}
export interface AnnualEvidence {
  year:number;scope:'annual-evidence-audit';anchorBranchIndex:number;
  stars:AnnualEvidenceItem[];
  transformations:(AnnualEvidenceItem&{target:string})[];
  rejectedStars:{name:string|null;reason:string}[];
  rejectedTransformations:{name:string|null;reason:string}[];
  markers:AnnualEvidenceItem[];
  summary:{validStars:number;validTransformations:number;rejectedStars:number;rejectedTransformations:number;inFourCourts:number};
  methodology:string;expertReviewed:false;
}
export declare function auditAnnualEvidence(chart:AstrologyResult,annual:AnnualOverview,anchorBranchIndex:number):AnnualEvidence;

export interface PalaceEvidenceItem {
  star:string; status:string; kind:string; sourcePath?:string|null; layer?:string|null;
  branchIndex?:number; branch?:string; palace?:string; strength?:string|null;
  strengthStatus?:string; strengthPath?:string; transformation?:string; targetPath?:string|null;
}
export interface PalaceEvidenceLens {
  id:'main'|'support'|'challenge'|'transformation'; title:string;question:string;
  status:'observed'|'no-data'|'needs-review'; observed:PalaceEvidenceItem[];
  problems:PalaceEvidenceItem[]; observedCount:number;problemCount:number;
}
export interface PalaceEvidenceLenses {
  status:'research-only'|'unavailable'; palace:string; branch?:string;edition?:string;
  expertReviewed:false; lenses:PalaceEvidenceLens[];notice:string;
}
export declare function buildPalaceEvidenceLenses(chart:AstrologyResult,branchIndex:number):PalaceEvidenceLenses;

export interface PalaceConditionalEvidence {
  star:string;kind:string;palace:string;branch?:string;branchIndex:number;scope:'natal'|'annual';
  strength?:string;transformation?:string;year?:number;
  sourcePath?:string;strengthPath?:string;targetPath?:string;
}
export interface PalaceConditionalSynthesis {
  status:'research-only'|'unavailable';scope?:'conditional-palace-synthesis';edition?:string;
  palace:string;branch?:string;expertReviewed:false;notice:string;
  records:{id:'main-support'|'main-challenge'|'main-transformation'|'natal-annual';
    title:string;question:string;status:'observed'|'partial'|'no-data'|'needs-review';
    condition:string;evidence:PalaceConditionalEvidence[];missing:string[];expertReviewed:false}[];
}
export declare function buildPalaceConditionalSynthesis(chart:AstrologyResult,branchIndex:number,
  options?:{annualEvidence?:AnnualEvidence|null}):PalaceConditionalSynthesis;

export interface PalaceRelationalEvidence {
  star:string;kind:string;scope:'natal';palace:string;branch:string;branchIndex:number;
  sourcePath?:string;strengthPath?:string;strength?:string;relation:string;side?:'trước'|'sau';
}
export interface PalaceRelationalSynthesis {
  status:'research-only'|'unavailable';scope?:'palace-relational-synthesis';edition?:string;
  palace:string;branch?:string;expertReviewed:false;notice:string;
  records:{id:'tam-hop'|'doi-cung'|'giap-cung';title:string;question:string;
    status:'observed'|'partial'|'no-data'|'needs-review';condition:string;
    checks:{label:string;met:boolean}[];evidence:PalaceRelationalEvidence[];
    missing:string[];expertReviewed:false;relatedBranches:number[];
    focusIsVoChinhDieu?:boolean;matchedPairs?:string[][]}[];
}
export declare function buildPalaceRelationalSynthesis(chart:AstrologyResult,branchIndex:number):PalaceRelationalSynthesis;

export interface TwelvePalaceStudy {
  edition?:string;status:'research-only'|'unavailable';palace:string;branch?:string;focus?:string;
  steps?:{scope:string;question:string;evidence:string}[];
  deepDives?:{id:string;title:string;discussion:string;question:string;related:{palace:string;branch:string|null;stars:string[];transformations:string[];unavailable?:boolean}[]}[];
  evidenceLenses?:PalaceEvidenceLenses;
  conditionalSynthesis?:PalaceConditionalSynthesis;
  relationalSynthesis?:PalaceRelationalSynthesis;
  coverage?:{mainStarCount:number;validStrengthCount:number;oppositeMainStarCount:number;annualAudited:boolean};
  annual?:null|{year:number;localStars:string[];localTransformations:string[];localMarkers:string[];rejected:number};
  expertReviewed:false;notice:string;
}
export declare function createTwelvePalaceStudy(chart:AstrologyResult,branchIndex:number,
  options?:{includeAnnual?:boolean;annualEvidence?:AnnualEvidence|null}):TwelvePalaceStudy;

export interface FourCourtLedgerItem {
  star:string;branchIndex:number;palace?:string;branch?:string;relation?:string;
  strength?:string;transformation?:string;
}
export interface FourCourtLedgerIssue {
  category:string;star:string;reason:string;palace?:string;branch?:string;relation?:string;
}
export interface FourCourtReadingLedger {
  status:'research-only'|'unavailable';edition?:string;scope?:'natal-four-court-evidence-ledger';
  palace:string;branch?:string;anchorBranchIndex?:number;expertReviewed:false;notice:string;
  summary:{courtCount:number;observedEntries:number;localEntries:number;issues:number;
    validNatalTransformations:number;focusIsVoChinhDieu:boolean};
  courts:{palace:string;branch:string;branchIndex:number;relation:string;mainStarCount:number;
    isVoChinhDieu:boolean;status:'observed'|'needs-review'|'no-data';
    groups:{main:FourCourtLedgerItem[];support:FourCourtLedgerItem[];challenge:FourCourtLedgerItem[];
      transformation:FourCourtLedgerItem[];obstruction:FourCourtLedgerItem[]};issues:FourCourtLedgerIssue[]}[];
  questions:{id:string;title:string;question:string;status:'observed'|'needs-review'|'no-data';
    evidence:FourCourtLedgerItem[];issues:FourCourtLedgerIssue[];missing:string[];expertReviewed:false}[];
}
export declare function buildFourCourtReadingLedger(chart:AstrologyResult,branchIndex:number):FourCourtReadingLedger;

export interface PalaceArgumentEvidence {
  star:string;branchIndex:number;palace:string;branch:string;relation:string;
  kind:'main'|'support'|'challenge'|'transformation'|'obstruction';
  strength?:string;transformation?:string;
}
export interface PalaceArgumentMap {
  status:'research-only'|'unavailable';edition?:string;scope?:string;
  palace:string;branch?:string;anchorBranchIndex?:number;expertReviewed:false;notice:string;
  summary?:{caseCount:number;observed:number;partial:number;needsReview:number};
  arguments:{id:'toa-doi'|'hoi-tam-hop'|'hoa-dich'|'doi-trong';title:string;overview:string;
    question:string;counterexample:string;status:'observed'|'partial'|'no-data'|'needs-review';
    scope:'natal-four-courts';checks:{label:string;met:boolean}[];
    evidence:PalaceArgumentEvidence[];
    issues:{star:string;reason:string;relation:string;palace:string;branchIndex:number}[];
    missing:string[];expertReviewed:false;confirmedClassicalFormation:false}[];
}
export declare function buildPalaceArgumentMap(chart:AstrologyResult,branchIndex:number,options?:{ledger?:FourCourtReadingLedger}):PalaceArgumentMap;

export interface PalaceReading {
  edition:string;palace:string;branch:string;stem:string;title:string;
  introduction:string;reflection:string;boundary:string;guidance:readonly string[];
  stars:StarReading[];conditionalPatternEvidence:ConditionalPatternEvidence;primaryPalaceContexts:PrimaryPalaceContext[];isVoChinhDieu:boolean;supporting:string[];natalHoa:string[];
  supportingProfiles:{name:string;family:string;motif:string|null;context:string|null;caution:string|null}[];
  cycleProfiles:{name:string;family:string;motif:string|null;context:string|null;caution:string|null}[];
  obstructionProfiles:{name:string;motif:string|null;context:string|null;caution:string|null}[];
  combinations:{id:string;title:string;interpretation:string;caution:string;evidence:{scope:'same-palace'|'natal-transformation';stars:string[];transformation?:string}}[];
  relationshipMatches:{id:string;title:string;interpretation:string;caution:string;evidence:{scope:'tam-hop'|'tu-chinh';placements:{star:string;palace:string;branch:string;branchIndex:number;relation:'Tọa cung'|'Tam hợp'|'Đối cung'}[]}}[];
  classicalMatches:{id:string;title:string;interpretation:string;boundary:string;assessment:string;evidence:{scope:'tu-chinh';
    placements:{star:string;palace:string;branch:string;branchIndex:number;relation:'Tọa cung'|'Tam hợp'|'Đối cung'}[];
    supports:{star:string;palace:string;branch:string;branchIndex:number;relation:'Tọa cung'|'Tam hợp'|'Đối cung'}[];
    reviewSignals:{type:string;star:string;palace:string;branch:string;branchIndex:number;relation:'Tọa cung'|'Tam hợp'|'Đối cung'}[];
    strengths:{star:string;status:string|null;branchIndex:number}[];uncertainStrength:boolean;}}[];
  /** Study-only V11.39 checklist: structural conditions are never expert confirmation. */
  classicalCriteria:{id:string;title:string;focusBranchIndex:number;focusPalace:string;
    required:{star:string;branchIndex:number|null;locationCount:number;status:string}[];
    missing:{star:string;branchIndex:number|null;locationCount:number;status:string}[];
    focusIsMenh:boolean;focusStarPresent:boolean;supportPresent:string[];reviewPresent:string[];
    strengths:{star:string;status:string|null}[];evidenceReview:FourCourtEvidence;studyGuide:FourCourtStudyGuide;reviewMatrix:ClassicalReviewMatrix;structuralCandidate:boolean;
    classification:'editorial-pattern-only'|'conditions-not-met';classicalFormationConfirmed:false;expertReviewed:false;boundary:string}[];
  natalPairStudy:NatalPairStudy;
  natalMultiStarStudy:NatalMultiStarStudy;
  annualEvidence:AnnualEvidence|null;
  twelvePalaceStudy:TwelvePalaceStudy;
  fourCourtReadingLedger:FourCourtReadingLedger;
  palaceArgumentMap:PalaceArgumentMap;
  geometryMatches:{id:string;title:string;interpretation:string;caution:string;geometry:string;relation:string;evidence:{star:string;palace:string;branch:string;branchIndex:number;position:string}[]}[];
  adjacentMatches:{id:string;title:string;interpretation:string;caution:string;evidence:{scope:'giap-cung';placements:{star:string;palace:string;branch:string;branchIndex:number;side:'Kề trước'|'Kề sau'}[]}}[];
  menhThan:{status:'unavailable';notice:string;relevant:false} | {status:'verified';scope:string;relevant:boolean;explanation:string;notice:string;menh:{branchIndex:number;branch:string;palace:string;stars:string[]};than:{branchIndex:number;branch:string;palace:string;stars:string[]}};
  linked:{kind:'Tam hợp'|'Đối cung';palace:string;branch:string;starNames:string[]}[];
  period:null|{year:number;markers:string[];annualStars:string[];annualHoa:string[];rejectedCount:number};
  coverage:{unknownMainStars:string[];unknownSupportingStars:string[];unknownCycleStars:string[];supportingExplained:boolean;editorialCombinationRulesEvaluated:number;relationshipPatternsEvaluated:number;classicalFamiliesReviewed:number;classicalFamiliesConfirmed:boolean;adjacentPatternsEvaluated:number;geometryPatternsEvaluated:number;menhThanVerified:boolean;formalPatternMatching:boolean;completeAnnualAnalysis:boolean};
  notice:string;
}
export declare function buildPalaceReading(input:{chart:AstrologyResult;branchIndex:number;
  guide?:{stars:Readonly<Record<string,{motif:string;study:string;caution:string}>>};
  annual?:AnnualOverview|null;includeAnnual?:boolean}):PalaceReading;

export declare function matchCombinations(house:AstrologyResult['houses'][number]):PalaceReading['combinations'];

export declare function matchRelationshipPatterns(chart:AstrologyResult,branchIndex:number):PalaceReading['relationshipMatches'];

export declare function matchClassicalFamilies(chart:AstrologyResult,branchIndex:number):PalaceReading['classicalMatches'];
export declare function buildFourCourtStudyGuide(id:string,evidence:FourCourtEvidence,context:{focusIsMenh:boolean;focusStarPresent:boolean}):FourCourtStudyGuide;
export declare function inspectFourCourtEvidence(chart:AstrologyResult,branchIndex:number,rule:{conditions:{requiredStars:string[];supportAny:string[];reviewAny:string[]}}):FourCourtEvidence;
export declare function describeClassicalCandidateCriteria(chart:AstrologyResult,branchIndex:number):PalaceReading['classicalCriteria'];

export declare function matchAdjacentPatterns(chart:AstrologyResult,branchIndex:number):PalaceReading['adjacentMatches'];
export declare function matchNatalGeometry(chart:AstrologyResult,branchIndex:number):PalaceReading['geometryMatches'];
export declare function compareMenhThan(chart:AstrologyResult,branchIndex:number):PalaceReading['menhThan'];
export {comparePeriods} from './period-timeline';
export type {PeriodTimeline,PeriodTimelineYear} from './period-timeline';

export {getTemporalExplorer,listLunarMonths,getHourBranch} from './temporal-explorer';
export type {TemporalExplorer,LunarMonthChoice} from './temporal-explorer';

export declare function calculateSubannualBranches(chart:AstrologyResult,selection:{year:number;month:number;leap?:boolean;day:number;hour:number}):{
 ruleSet:string;status:'research-only';convention:string;leapPolicy:string;monthIsLeap:boolean;
 annualThaiTue:SubannualBranch;dauQuan:SubannualBranch;luuNguyet:SubannualBranch;luuNhat:SubannualBranch;luuThoi:SubannualBranch;
 coverage:{monthlyPalace:true;dailyPalace:true;hourlyPalace:true;monthlyStars:false;dailyStars:false;hourlyStars:false;independentExpertReview:false};caution:string;
};
export interface SubannualBranch {branchIndex:number;branch:string;palace:string;}

export declare function getSubannualResearch(chart:AstrologyResult,year:number,month?:number,leap?:boolean,day?:number,hour?:number):ReturnType<typeof calculateSubannualBranches>;

/** V11.62: conditional observations for all 12 natal palaces; never a forecast. */
export interface WholeChartWalkthrough {
  status:'research-only';edition:'11.62.0';scope:'natal-whole-chart';
  expertReviewed:false;confirmedClassicalFormation:false;
  summary:{palaceCount:12;threadCount:number;fullyObserved:number;needsReview:number};
  steps:{order:number;palace:string;branch:string;branchIndex:number;title:string;
    status:'needs-review'|'fully-observed'|'partly-observed'|'no-data';
    localIsVoChinhDieu:boolean;localMain:string[];
    geometry:{triad:string[];opposite:string};paragraphs:string[];
    cases:{id:string;title:string;status:'observed'|'partial'|'no-data'|'needs-review';
      checks:{label:string;met:boolean}[];evidence:PalaceArgumentEvidence[];
      missing:string[];issues:{star:string;reason:string;palace:string}[];
      question:string;counterexample:string}[];
    issues:string[];reflection:string;expertReviewed:false;confirmedClassicalFormation:false}[];
  threads:{id:string;title:string;question:string;geometry:'tam-hop'|'doi-cung'|'thematic';
    geometryVerified:boolean|null;status:'needs-review'|'fully-observed'|'partly-observed';
    steps:{palace:string;branch:string;branchIndex:number;localMain:string[];
      status:'needs-review'|'fully-observed'|'partly-observed'|'no-data';issueCount:number}[];
    caution:string}[];
  notice:string;
}
export declare function buildWholeChartWalkthrough(chart:AstrologyResult):WholeChartWalkthrough;

/** V11.69: evidence-only four-court reading of a chosen *natal* star. */
export interface StarEvidenceCourt {
  relation:'Tọa cung'|'Tam hợp'|'Đối cung';branchIndex:number;branch:string;palace:string;
  mainStars:string[];mainStrengths:{name:string;status:string;label:string}[];
  supportStars:string[];challengingStars:string[];starCount:number;
  transformations:{name:string;target:string;verified:boolean}[];obstructions:string[];names:string[];
}
export interface StarEvidenceMatrix {
  scope:'natal-four-courts-only';star:string;branchIndex:number;palace:string;
  courts:StarEvidenceCourt[];selectedTransformations:{name:string;target:string;verified:boolean}[];
  voChinhDieu:boolean;oppositeMainStarsForReference:string[];issues:string[];
  reviewedByExpert:false;notice:string;
}
export declare function buildStarEvidenceMatrix(houses:readonly AstrologyHouse[],branchIndex:number,star:string):StarEvidenceMatrix;

export {buildDeepChartReading} from './deep-chart-reading';
export type {DeepChartReading,DeepPalace,DeepEvidence,DeepParagraph,DeepTransformation} from './deep-chart-reading';

export {getTarotCardDepth,studyTarotSnapshot,tarotDepthSearchText} from './tarot-depth';
export type {TarotDepth,TarotDepthReading} from './tarot-depth';

export {compareTarotSnapshots} from './tarot-comparison';
export type {TarotComparison} from './tarot-comparison';

export {readingMetadata,validateReadingMetadata,studyWesternInput,exportWesternStudy,getWesternKnowledge} from './western-depth.cjs';
export type {WesternStudy,DispositorChain,PlanetProfile,SignProfile,HouseProfile,AspectProfile} from './western-depth.cjs';

export {studyRelationship,exportRelationshipReading,relationshipPointName} from './relationship-reading.cjs';
export type {RelationshipReading,InteractionReading} from './relationship-reading.cjs';
