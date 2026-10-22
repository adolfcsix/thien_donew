import type {NatalInput,NatalResult} from './western-natal.cjs';
export interface RelationshipInput {method:string;knowledge:{id:string;version:number;knowledgeEdition:string;knowledgeChecksum:string;natalKnowledgeChecksum:string;antipodalToleranceDegrees:number};a:NatalInput;b:NatalInput;orb:number;includeAngles:boolean;compositeHouses:'midpoint-cusps'|'whole-sign-from-midpoint-asc';context:string}
export interface Midpoint {longitude:number|null;ambiguous:boolean;candidates:number[];separation:number}
export interface RelationshipPoint {id:string;kind:string;longitude:number;sign:string;house?:number}
export interface CrossAspect {a:string;b:string;kindA:string;kindB:string;name:string;angle:number;separation:number;orb:number}
export interface CompositeChart {method:string;houseMethod:string;planets:(Midpoint&{body:string;sign:string|null;degreeInSign:number|null;house:number|null})[];ascendant:Midpoint;midheaven:Midpoint&{house:number|null};houses:(Midpoint&{number:number;sign:string|null})[];aspects:{first:string;second:string;name:string;targetAngle:number;separation:number;orb:number}[];ambiguousBodies:string[];unresolvedHouses:boolean;notice:string}
export interface RelationshipResult {format:string;version:number;input:RelationshipInput;a:NatalResult;b:NatalResult;pointsA:RelationshipPoint[];pointsB:RelationshipPoint[];aspects:CrossAspect[];overlays:{aInB:{body:string;longitude:number;house:number}[];bInA:{body:string;longitude:number;house:number}[]};composite:CompositeChart;sensitivity:null|{sampleCount:number;samples:unknown[];stableAspectKeys:string[];variableAspectKeys:string[];overlayChanged:boolean;compositeHouseChanged:boolean;notice:string};warnings:string[]}
export const METHOD:string;
export function getRelationshipMethod():RelationshipInput['knowledge']&{crossAspectAngles:number[];orbPolicy:string;compositeHouses:string[];contexts:string[]};
export function createRelationshipInput(a:NatalInput,b:NatalInput,options?:Partial<Pick<RelationshipInput,'orb'|'includeAngles'|'compositeHouses'|'context'>>):RelationshipInput;
export function validateRelationshipInput(raw:unknown):RelationshipInput;
export function circularMidpoint(a:number,b:number):Midpoint;
export function natalPoints(chart:NatalResult,includeAngles?:boolean):RelationshipPoint[];
export function crossAspects(a:RelationshipPoint[],b:RelationshipPoint[],orb:number):CrossAspect[];
export function houseFromCusps(longitude:number|null,cusps:CompositeChart['houses']):number|null;
export function compositeChart(a:NatalResult,b:NatalResult,method:string,orb:number):CompositeChart;
export function calculateRelationship(raw:unknown):RelationshipResult;
export function exportRelationshipInput(input:RelationshipInput):{format:string;version:number;input:RelationshipInput};
export function parseRelationshipInput(raw:unknown):RelationshipInput;
