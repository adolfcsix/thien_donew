export interface TarotCard {id:string;arcana:'major'|'minor';number:number;suit?:'wands'|'cups'|'swords'|'pentacles';element?:string;name:string;nameVi:string;symbol:string;upright:string;reversed:string;reflection:string}
export interface TarotDraw {id:string;reversed:boolean}
export interface TarotPosition {id:string;label:string;role:string;prompt:string;x:number;y:number;rotation:0|90}
export interface TarotLayout {id:string;version:1;name:string;positions:TarotPosition[]}
export interface AdvancedTarotSnapshot {version:2;deck:string;spread:'one'|'three'|'celtic-cross'|'custom';includeReversed:boolean;question:string;draw:TarotDraw[];method:{id:string;version:2;knowledgeEdition:string;knowledgeChecksum:string;deckCatalogChecksum:string};context:'general'|'work'|'relationship'|'resources';layout:TarotLayout}
export type TarotSnapshot = LegacyTarotSnapshot|AdvancedTarotSnapshot;
export interface LegacyTarotSnapshot {version:1;deck:string;spread:'one'|'three';includeReversed:boolean;question:string;draw:TarotDraw[]}
export type TarotReading = TarotSnapshot & {positions:Array<{index:number;label:string;card:TarotCard;orientation:'upright'|'reversed';meaning:string;reflection:string}>}
export const CARDS:readonly TarotCard[];
export const METHODS:{readonly version:number;readonly deck:string;readonly supportedSpreads:readonly string[];readonly positionLabels:{readonly one:readonly string[];readonly three:readonly string[]}};
export function secureIndex(max:number,randomBytes?:(n:number)=>Uint8Array):number;
export function newSpread(options?:{spread?:'one'|'three';includeReversed?:boolean;question?:string},randomBytes?:(n:number)=>Uint8Array):LegacyTarotSnapshot;
export function validateSpreadSnapshot(input:unknown):TarotSnapshot;
export function reading(snapshot:unknown):TarotReading;

export const TAROT_ARCHIVE:{readonly format:string;readonly version:number;readonly maxBytes:number};
export interface TarotReadingExport {format:string;version:number;exportedAt:string;snapshot:TarotSnapshot}
export function createReadingExport(snapshot:unknown,exportedAt?:string):TarotReadingExport;
export function parseReadingExport(text:string):TarotSnapshot;
