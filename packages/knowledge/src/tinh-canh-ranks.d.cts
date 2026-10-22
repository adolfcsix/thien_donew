export type Direction='hoc-gia'|'luan-gia'|'kham-pha-gia'|'nguoi-dan-loi';
export interface Rank {level:number;stage:number;stageName:string;name:string;points:number;badge:string;effect:string;}
export interface Result {ruleset:string;rank:Rank;points:number;newPoints:number;legacyPoints:number;directions:Record<Direction,number>;nextRank:Rank|null;blockedBy:null|{level:number;paths:number;events:number;havePaths:number;haveEvents:number};}
export const RULESET:string;
export const ranks:readonly Rank[];
export const stages:readonly (readonly [string,readonly string[]])[];
export const directions:readonly Direction[];
export const awards:Readonly<Record<string,{direction:Direction;points:number;source:string}>>;
export const milestone:Readonly<Record<number,{paths:number;events:number}>>;
export function evaluate(points:number,counts?:Partial<Record<Direction,number>>,legacy?:number,legacyCount?:number):Result;
export function visibleRanking(row:{userId:string;displayName:string;points:number;level:number;rankName:string}):{userId:string;displayName:string;points:number;level:number;rankName:string};
