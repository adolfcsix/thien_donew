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
