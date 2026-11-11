/** Source-alias comparison only, never evidence of star placement or fortune. */
export interface ClassicalVoidSourceTerm {
 readonly sourceLabel:string;
 readonly normalized:string;
}
export interface ClassicalVoidVocabularyAudit {
 readonly sourceUrl:string;
 readonly sourceCommit:string;
 readonly recognized:readonly ClassicalVoidSourceTerm[];
 readonly unresolved:readonly string[];
 readonly normalizedNames:readonly string[];
 readonly sourcePlacementVerified:false;
 readonly schoolVariantVerified:false;
 readonly sourceCriterionVerified:false;
 readonly lexicalOnly:true;
}
export declare const SOURCE_COMMIT:'7922285d947b36610e7e31c232d8f1e2a0d0871d';
export declare const SOURCE_URL:string;
export declare const SOURCE_NAMES:readonly string[];
export declare const NORMALIZED_NAMES:readonly string[];
export declare const SOURCE_ALIASES:readonly Readonly<{legacy:string;normalized:string;basis:string}>[];
export declare const SOURCE_VARIANTS:readonly string[];
export declare const SOURCE_VOID_NOTICE:string;
export declare const CATALOG_AUDIT:ClassicalVoidVocabularyAudit;
export declare function reconcileClassicalVoidVocabulary(sourceLabels:readonly string[]):ClassicalVoidVocabularyAudit;

/** R21: literal 1-based source table cells; never mapped into Thiên Đồ chart positions. */
export type ClassicalVoidSchoolVariant='single'|'double'|'zhanyan';
export interface ClassicalVoidSourceStemRow {
 readonly stem:string;
 readonly ordinal:number;
 readonly xunSourceCode:number;
 readonly single:readonly number[];
 readonly double:readonly number[];
 readonly zhanyan:readonly number[];
 readonly sourceCodeMappingVerified:false;
 readonly sourceSchoolParityVerified:false;
}
export interface ClassicalVoidStemCodeLookup {
 readonly stem:string;
 readonly variant:ClassicalVoidSchoolVariant;
 readonly ordinal:number;
 readonly xunSourceCode:number;
 readonly sourceCodes:readonly number[];
 readonly sourceUrl:string;
 readonly sourcePlacementVerified:false;
 readonly sourceSchoolParityVerified:false;
 readonly sourceCriterionVerified:false;
 readonly sourceCodeMappingVerified:false;
}
export declare const SOURCE_SCHOOL_DATA_URL:string;
export declare const SOURCE_STEMS:readonly string[];
export declare const SOURCE_VOID_STEM_ROWS:readonly ClassicalVoidSourceStemRow[];
export declare const SOURCE_STEM_MATRIX_NOTE:string;
export declare const SOURCE_XUN_CODES:readonly number[];
export declare function lookupVoidStemCodes(stem:string,variant:ClassicalVoidSchoolVariant):ClassicalVoidStemCodeLookup|null;
