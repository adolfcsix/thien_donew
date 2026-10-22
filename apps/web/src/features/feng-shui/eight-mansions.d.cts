export type Gua={number:number;name:string;han:string;direction:string;group:string;element:string};
export type DirectionReading={direction:string;key:string;label:string;kind:'cát'|'hung'};
export declare const GUA:Record<number,Omit<Gua,'number'>>;
export declare const DIRECTIONS:readonly string[];
export declare const LABELS:Record<string,string>;
export declare function lifeGua(solarYear:number,method:'male'|'female'):Readonly<Gua&{solarYear:number;method:string;raw:number;substitution:boolean;rule:string}>;
export declare function directionsForGua(number:number):readonly DirectionReading[];
export declare function houseGua(sittingTrigram:string):Readonly<Gua&{method:string}>;
export declare function compareGua(lifeNumber:number,houseNumber:number):Readonly<{sameGroup:boolean;lifeGroup:string;houseGroup:string;note:string}>;
