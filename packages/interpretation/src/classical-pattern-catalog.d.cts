export type SourcePatternStatus='derivable'|'disputed'|'unreachable';
export interface ClassicalCatalogEntry {
 readonly id:string;
 readonly title:string;
 readonly sourceStatus:SourcePatternStatus;
 readonly sourceUrl:string;
 readonly scope:'period-research'|'natal-research';
}
export interface ClassicalCatalogGroup {
 readonly key:string;
 readonly name:string;
 readonly sourceUrl:string;
 readonly entries:readonly ClassicalCatalogEntry[];
}
export interface ClassicalCatalogEntryView extends ClassicalCatalogEntry {
 readonly assessed:boolean;
}
export interface ClassicalCatalogGroupView {
 readonly key:string;
 readonly name:string;
 readonly sourceUrl:string;
 readonly total:number;
 readonly assessed:number;
 readonly entries:readonly ClassicalCatalogEntryView[];
}
export interface ClassicalCatalogReport {
 readonly referenceTotal:49;
 readonly assessed:number;
 readonly distribution:Readonly<{derivable:number;disputed:number;unreachable:number}>;
 readonly groups:readonly ClassicalCatalogGroupView[];
 readonly notice:string;
}
export declare const SOURCE:string;
export declare const SOURCE_COMMIT:'7922285d947b36610e7e31c232d8f1e2a0d0871d';
export declare const GROUPS:readonly ClassicalCatalogGroup[];
export declare const ALL:readonly ClassicalCatalogEntry[];
export declare function summarizeClassicalCatalog(assessedIds?:readonly string[]):ClassicalCatalogReport;
