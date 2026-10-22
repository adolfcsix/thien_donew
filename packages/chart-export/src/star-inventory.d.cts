import type {AstrologyHouse,AstrologyResult,AnnualOverview} from '@thiendo/shared-types';
export function natalGroups(house:AstrologyHouse):{label:string;names:string[]}[];
export function natalNames(house:AstrologyHouse):string[];
export function supportingNames(house:AstrologyHouse):string[];
export function renderStarAppendixHtml(chart:AstrologyResult,annual?:AnnualOverview):string;
