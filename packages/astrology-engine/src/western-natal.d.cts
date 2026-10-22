export interface NatalReadingMetadata {id:string;version:number;knowledgeEdition:string;knowledgeChecksum:string;rulerPolicy:string;context:string}
export interface NatalInput {reading?:NatalReadingMetadata;method:'western-tropical-geocentric-whole-sign-v1'|'western-tropical-geocentric-whole-sign-iana-v2';timeZone?:string;disambiguation?:'reject'|'earlier'|'later';tzdbVersion?:string;resolvedUtc?:string;offsetSeconds?:number;uncertaintyMinutes?:number;date:string;hour:number;minute:number;utcOffsetMinutes:number;offsetConfirmed:boolean;latitude:number;longitude:number;houseSystem:'whole-sign';orb:number}
export interface NatalPlanet {body:string;longitude:number;latitude:number;distanceAu:number;speedDegreesPerDay:number;motion:string;signIndex:number;sign:string;degreeInSign:number;house:number}
export interface NatalAspect {first:string;second:string;name:string;targetAngle:number;separation:number;orb:number}
export interface NatalResult {input:NatalInput;utc:string;ascendant:number;midheaven:number;localSiderealDegrees:number;obliquityDegrees:number;planets:NatalPlanet[];houses:{number:number;cuspLongitude:number;signIndex:number;sign:string}[];aspects:NatalAspect[];provenance:{engine:string;version:string;coordinates:string;zodiac:string;houses:string;angleMethod:string;speedMethod:string;reference:string};warnings:string[];sensitivity?:{minutes:number;samples:{deltaMinutes:number;utc:string;ascendant:number;midheaven:number;ascendantSign:number;planets:{body:string;signIndex:number;house:number}[]}[];changedBodies:string[];ascendantSignChanged:boolean}}
export const METHOD:'western-tropical-geocentric-whole-sign-v1';
export const BODIES:readonly string[];
export const SIGNS:readonly string[];
export function validateInput(raw:unknown):NatalInput;
export function utcTime(input:NatalInput):Date;
export function calculate(raw:unknown):NatalResult;
export function angularDistance(a:number,b:number):number;
export function houseFor(longitude:number,ascendant:number):number;

export const ZONED_METHOD:'western-tropical-geocentric-whole-sign-iana-v2';

/** Geometry sample at a relative UTC offset, not a new standalone birth input. */
export function sampleNatalAtOffset(raw:NatalInput,deltaMinutes:number):NatalResult;
