import type {TarotSnapshot,AdvancedTarotSnapshot,TarotLayout} from './tarot-rws.cjs';
export interface TarotSpreadRegistry {schemaVersion:1;edition:string;method:AdvancedTarotSnapshot['method'];contexts:string[];roles:Record<string,{label:string;guidance:string}>;layouts:TarotLayout[];celticSource:{title:string;url:string;convention:string;adaptation:string};customLimits:{cards:number;columns:number;rows:number;labelCharacters:number;promptCharacters:number;snapshotBytes:number};legacy:{version:1;method:string;baseKnowledgeEdition:string;deepKnowledgeEdition:string;notice:string};}
export function getSpreadRegistry():TarotSpreadRegistry;
export function makeCustomLayout(positions:TarotLayout['positions'],name?:string):TarotLayout;
export function validateAdvancedSnapshot(raw:unknown):AdvancedTarotSnapshot;
export function newAdvancedSpread(options?:{spread?:AdvancedTarotSnapshot['spread'];includeReversed?:boolean;question?:string;context?:AdvancedTarotSnapshot['context'];layout?:TarotLayout},randomBytes?:(n:number)=>Uint8Array):AdvancedTarotSnapshot;
export function describeTarotMethod(snapshot:TarotSnapshot):{id:string;version:number;knowledgeEdition:string;name:string;context:string|null;legacy:boolean;notice?:string;layoutId?:string;layoutVersion?:number};
