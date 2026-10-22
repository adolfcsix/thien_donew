import type {RelationshipResult,CrossAspect,RelationshipInput} from '../../astrology-engine/src/western-relationship.cjs';
export interface InteractionReading {title:string;reading:string;question:string}
export interface RelationshipReading extends RelationshipResult {context:{name:string;prompt:string};synastryReadings:(CrossAspect&InteractionReading)[];overlayReadings:{aInB:{body:string;longitude:number;house:number;bodyName:string;area:string;question:string;notice:string}[];bInA:{body:string;longitude:number;house:number;bodyName:string;area:string;question:string;notice:string}[]};compositeReadings:(RelationshipResult['composite']['planets'][number]&{bodyName:string;reading:string;question:string})[];compositeAspectReadings:(RelationshipResult['composite']['aspects'][number]&InteractionReading)[];sources:{id:string;title:string;url:string;scope:string}[];notice:string}
export function studyRelationship(input:RelationshipInput):RelationshipReading;
export function exportRelationshipReading(report:RelationshipReading):unknown;
export function relationshipPointName(id:string):string;
