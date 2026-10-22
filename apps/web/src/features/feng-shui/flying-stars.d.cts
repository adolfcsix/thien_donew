export type StarPalace={number:number;direction:string;trigram:string;step:number;star:number;name:string;han:string;element:string};
export declare const PATH:readonly number[];
export declare const PALACES:readonly {number:number;direction:string;trigram:string}[];
export declare const STARS:Record<number,{name:string;han:string;element:string}>;
export declare function flyFromCenter(center:number,direction?:'forward'|'reverse'):readonly StarPalace[];
export declare function periodStarChart(period:number):Readonly<{period:number;center:number;positions:readonly StarPalace[];boundary:string;limitation:string}>;
export declare function annualStarChart(solarYear:number):Readonly<{solarYear:number;center:number;positions:readonly StarPalace[];boundary:string;limitation:string}>;
export declare function periodByConfirmedSolarYear(solarYear:number):Readonly<{solarYear:number;period:number;starts:number;warning:string}>;
