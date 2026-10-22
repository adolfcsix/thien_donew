export interface PalaceTopic {
  id:string;
  title:string;
  context:string;
  reflection:string;
  boundary:string;
  guidance:readonly string[];
}
export declare const edition:string;
export declare const topics:Readonly<Record<string,PalaceTopic>>;
export declare const palaceNames:readonly string[];
export declare function lookupPalace(name:string):PalaceTopic|null;

export interface StarSymbol {family:string;motif:string;context:string;caution:string;}
export interface CombinationRule {id:string;title:string;conditions:{scope:'same-palace';all:string[]} | {scope:'natal-transformation';name:string};interpretation:string;caution:string;}
export declare const symbolEdition:string;
export declare const starSymbols:Readonly<Record<string,StarSymbol>>;
export declare function lookupSymbol(name:string):StarSymbol|null;
/** V11.57 editorial star studies: researched prompts, not chart placement rules. */
export interface StarDossier {
  interpretiveAxis:string; workedReading:string; crossCheckStars:string[];
  counterEvidence:string; practiceQuestion:string; boundary:string;
}
export declare const starDossiers: {
  schemaVersion:string; edition:string;
  scope:'editorial-deep-dossiers-no-placement'; expertReviewed:false;
  notice:string; profiles:Record<string,StarDossier>;
};
export declare function lookupStarDossier(name:string):StarDossier|null;
/** V11.60 individually authored counter-readings: never chart placement or validated predictions. */
export interface StarCriticalReading {
  distinction:string; caseStudy:string; counterExample:string; inquiry:string;
  reviewStatus:'editorial-unreviewed';
}
export declare const starCriticalReadings:{
  schemaVersion:'1.0.0'; edition:'11.60.0';scope:'educational-counter-reading-no-placement';
  expertReviewed:false; notice:string; records:Readonly<Record<string,StarCriticalReading>>;
};
export declare function lookupStarCriticalReading(name:string):StarCriticalReading|null;
/** V11.57 only orders known cycle names; no placement data is exported here. */
export interface StarCycleResearch {
  cycle:string;order:number;total:number;previous:string;next:string;methodology:string;
}
export declare const starCycleStudy:{schemaVersion:string;edition:string;scope:'educational-cycle-order-not-placement';expertReviewed:false;notice:string;cycles:{name:string;count:number;orderedNames:string[];methodology:string}[]};
export declare function lookupStarCycleStudy(name:string):StarCycleResearch|null;


export declare const combinationEdition:string;
export declare const combinationRules:readonly CombinationRule[];

export interface ObstructionSymbol {motif:string;context:string;caution:string;}
export declare const obstructionSymbols:Readonly<Record<string,ObstructionSymbol>>;
export declare function lookupObstruction(name:string):ObstructionSymbol|null;

export interface RelationshipPatternRule {
  id:string;title:string;conditions:{scope:'tam-hop'|'tu-chinh';all:string[];minDistinctPalaces:number;requiresFocusPresence:boolean};
  interpretation:string;caution:string;
}
export declare const relationshipEdition:string;
export declare const relationshipPatterns:readonly RelationshipPatternRule[];

export interface ClassicalFamilyRule {
  id:string;title:string;
  conditions:{focusPalace:'Mệnh';scope:'tu-chinh';requiredStars:string[];focusAny:string[];supportAny:string[];reviewAny:string[]};
  interpretation:string;boundary:string;
}
export declare const classicalEdition:string;
export declare const classicalFamilies:readonly ClassicalFamilyRule[];


/** Giáp cung là quan hệ vị trí, chưa phải kết luận thành cách. */
export interface AdjacentPalaceRule {id:string;title:string;stars:[string,string];interpretation:string;caution:string;}
export declare const adjacentEdition:string;
export declare const adjacentPalacePatterns:readonly AdjacentPalaceRule[];

/** Evidence-only natal relationships that cannot be represented as same-palace rules. */
export interface NatalGeometryRule {id:string;title:string;geometry:'flank-anchor'|'opposition'|'pair-separation';stars:[string,string];anchor?:string;interpretation:string;caution:string;}
export declare const geometryEdition:string;
export declare const natalGeometryRules:readonly NatalGeometryRule[];

/** Versioned catalogue of V11.13 stars, metadata and review state. */
export interface TraditionalCatalogueRecord {name:string;group:string;motif:string;natal:boolean;placementRuleSet:string;referenceKey:string;expertReviewed:boolean;}
export declare const traditionalCatalogueEdition:string;
export declare const traditionalCatalogue:readonly TraditionalCatalogueRecord[];
export declare const natalExtensionCatalogueEdition:string;
export declare const natalExtensionCatalogue:readonly TraditionalCatalogueRecord[];

/** V11.29 — internal roadmap inventory; not a promise of live functionality. */
export type CapabilityStatus = 'source-implemented' | 'internal-partial' | 'not-implemented';
export interface CapabilityRecord {
  readonly id:string; readonly name:string; readonly area:string;
  readonly status:CapabilityStatus; readonly route:string|null;
  readonly evidencePaths:readonly string[];
  readonly referenceMenuObserved:boolean;
  readonly nextGap:string;
}
export declare const capabilityRegistry: {
  readonly schemaVersion:string;
  getCapability(id:string):CapabilityRecord|null;
  listCapabilities(filter?:{status?:CapabilityStatus;area?:string;referenceMenuObserved?:boolean}):CapabilityRecord[];
  publicCapabilityLinks():{id:string;title:string;href:string}[];
};

/** V11.30 — Engine-derived canonical identity catalogue; not expert-validated. */
export type StarIdentityLayer = 'natal' | 'cycle' | 'annual' | 'obstruction' | 'natal-transformation' | 'annual-transformation' | 'annual-locator';
export type StarIdentityType = 'star' | 'annual-star' | 'paired-marker' | 'transformation-label' | 'branch-locator';
export interface StarIdentityRecord {
  readonly id:string; readonly name:string; readonly layer:StarIdentityLayer;
  readonly type:StarIdentityType; readonly group:string;
  readonly placementModule:string; readonly editorialSources:readonly string[];
  readonly originId:string|null; readonly expertReviewed:false;
  readonly reviewStatus:'not-independently-reviewed';
}
export interface StarRuleLink {
  readonly id:string; readonly kind:'combination'|'relationship'|'classical'|'adjacent'|'geometry';
  readonly source:string; readonly starIds:readonly string[];
}
export declare const starIdentityRegistry: {
  readonly schemaVersion:string;
  readonly counts:Readonly<Record<StarIdentityLayer,number>>;
  normalizeStarName(value:unknown):string|null;
  getStarIdentityById(id:unknown):StarIdentityRecord|null;
  findStarIdentities(name:unknown,filter?:{layer?:StarIdentityLayer}):StarIdentityRecord[];
  resolveStarIdentity(name:unknown,filter?:{layer?:StarIdentityLayer}):StarIdentityRecord|null;
  listStarIdentities(filter?:{layer?:StarIdentityLayer;group?:string;type?:StarIdentityType}):StarIdentityRecord[];
  getRulesReferencingStar(id:unknown):StarRuleLink[];
};


/** V11.36 — Editorial comparisons only; never a source of placement rules. */
export interface ReferenceStarRecord {
  name: string;
  family: string;
  status: 'engine-name' | 'possible-alias' | 'not-in-engine';
  matchType: string;
  engineNames: string[];
  engineIds: string[];
  layers: string[];
  expertReviewed: false;
  placementReady: boolean;
  note: string;
}
export declare const referenceStarCrosswalk: {
  schemaVersion:string; edition:string;
  reference:{title:string;url:string;checkedOn:string;method:string};
  interpretationBoundary:string;
  counts:Record<string,number>;
  records:ReferenceStarRecord[];
};
export interface DisciplineResearchRecord {
  id:string;name:string;focus:string;studyWorkflow:string;practiceExercise:string;
  boundary:string;route:string|null;
  implementation:'tool-present-not-professionally-validated'|'knowledge-only-no-engine';
  reviewStatus:'editorial-draft-not-expert-reviewed';
}
export declare const researchDisciplines:{edition:string;notice:string;records:DisciplineResearchRecord[]};
export interface StarFamilyResearchRecord {
  family:string;subject:string;howToRead:string;commonMistake:string;exercise:string;expertReviewed:false;
}
export declare const starFamilyResearch:{edition:string;scope:string;records:StarFamilyResearchRecord[]};

/** V11.37 — research dossiers, deliberately excluded from the placement engine. */
export interface ExpandedStarResearchRecord {
  id:string; name:string; researchSystem:string;
  state:'research-only-no-placement'|'engine-name-other-group-needs-rule-equivalence-review';
  expertReviewed:false; placementEnabled:false;
  placementInputsToVerify:string; readingContext:string;
  verificationExercise:string; commonMisreading:string;
  reviewGates:string[];
}
export declare const expandedStarResearch: {
  schemaVersion:string;edition:string; researchOnly:true;scope:string;
  circle:{id:string;name:string;hanzi:string;orderedNames:string[];algorithmImplemented:false;sourceNamesNotIn121Crosswalk:string[];separateFrom:string[];studyNote:string};
  records:ExpandedStarResearchRecord[];
  aliases:{name:string;candidate:string;issue:string;resolution:string}[];
  internalSources:{url:string;use:string}[];
};

/** V11.38: reference comparisons for Tướng Tiền; not a chart-placement API. */
export interface TuongTienStudyPlacement { readonly name:string; readonly branchIndex:number; readonly branch:string; }
export declare const tuongTienStudy: {
 readonly studyTable: {
  schemaVersion:string; edition:string; scope:'reference-only-research';
  automaticNatalPlacement:false; automaticAnnualPlacement:false; expertReviewed:false;
  branches:readonly string[]; orderedNames:readonly string[];
  groupStartByYearBranch:readonly number[];
  rows:readonly {yearBranch:string;yearBranchIndex:number;groupStart:string;placements:readonly TuongTienStudyPlacement[]}[];
 };
 calculateStudyCircle(yearBranch:number):readonly TuongTienStudyPlacement[];
 getStudyRow(yearBranch:number):{yearBranch:string;yearBranchIndex:number;groupStart:string;placements:readonly TuongTienStudyPlacement[]};
};

/** V11.39: editorial research only; no automatic natal/year placement. */
export declare const methodComparison: {
  lookupStudyPlacement(id:string,input:string):{profileId:string;name:string;system:string;inputAxis:string;input:string;branch:string;researchOnly:true;autoPlacement:false;expertReviewed:false;warning:string};
  auditProfiles(data?:unknown):{profiles:number;deferred:number;entries:number;errors:string[]};
};

/** V11.49 editorial-only catalogue, not validated astrological deductions. */
export declare const palaceRelationalSynthesis: {
  readonly edition:string; readonly scope:'palace-relational-synthesis'; readonly expertReviewed:false;
  readonly notice:string;
  readonly patterns:readonly {id:'tam-hop'|'doi-cung'|'giap-cung';title:string;scope:string}[];
  readonly eligibleFlankPairs:readonly (readonly [string,string])[];
  readonly profiles:Readonly<Record<string,Readonly<Record<'tam-hop'|'doi-cung'|'giap-cung',string>>>>;
};


/** V11.51: research-only review lifecycle; cannot be used as a placement rule. */
export interface SchoolReviewRecord {
 readonly id:string; readonly schoolId:string; readonly title:string;
 readonly reviewStage:'research-draft';readonly sourceReview:'not-independently-verified';
 readonly engineEnabled:false; readonly reference:{kind:string;id:string};
 readonly question:string;readonly limitation:string;
}
export declare const schoolReview: {
 readonly registry:{edition:string;researchOnly:true;engineIntegrationsAllowed:false;records:readonly SchoolReviewRecord[]};
 eligibility(entry:SchoolReviewRecord):{eligible:boolean;missing:string[]};
 getReview(id:string):SchoolReviewRecord|null;
 publicReviewCard(entry:SchoolReviewRecord):{id:string;title:string;schoolId:string;question:string;limitation:string;reviewStage:string;engineEnabled:false;readiness:string;missing:string[]};
};

/** V11.52: editorial controls, not evidence of academic review or an engine rule. */
export interface SchoolValidationProtocol {
 readonly ruleId:string;readonly category:string;readonly scopeAxis:string;
 readonly inputDimensions:readonly string[];
 readonly positiveControl:{goal:string;procedure:string};
 readonly negativeControl:{goal:string;procedure:string};
 readonly prohibitedShortcut:string;readonly sourceComparisonPrompt:string;readonly interpretationLimit:string;
 readonly expectedIndependentSources:2;readonly expectedIndependentFixtures:2;
 readonly reviewStatus:'unverified';readonly engineEnabled:false;
}
export declare const schoolValidationProtocols: {
 readonly registry:{edition:string;researchOnly:true;engineIntegrationsAllowed:false;protocols:readonly SchoolValidationProtocol[]};
 getValidationProtocol(ruleId:string):SchoolValidationProtocol|null;
 auditValidationProtocols():{version:string;status:string;count:number;linked:number;approvedForEngine:0;errors:string[]};
};

/** V11.88 research-only; these entries do not authorize use as verified school engines. */
export declare const phase2Schools:{
 registry:{schemaVersion:string;edition:string;researchOnly:true;disciplines:readonly {id:string;name:string;implementation:string;priority:string;existingBoundary:string}[];schools:readonly {id:string;disciplineId:string;title:string;status:string;engineIntegration:string;document:string;sources:readonly string[];pending:readonly string[]}[]};
 getDiscipline(id:string):{id:string;name:string;implementation:string;priority:string;existingBoundary:string}|null;
 getSchool(id:string):{id:string;disciplineId:string;title:string;status:string;engineIntegration:string;document:string;sources:readonly string[];pending:readonly string[]}|null;
 listSchools(disciplineId:string):readonly {id:string;title:string;status:string}[];
 gateSchoolExecution(id:string):Readonly<{verdict:'BLOCKED'|'RESEARCH_SUBROUTINE_ONLY';reason:string}>;
};
