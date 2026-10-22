export type Trigram = Readonly<{id:string;name:string;han:string;symbol:string;element:string;image:string;bits:string}>;
export type Hexagram = Readonly<{number:number;name:string;theme:string;inquiry:string;upper:Trigram;lower:Trigram;bits:string}>;
export declare const TRIGRAMS: readonly Trigram[];
export declare const KING_WEN_GRID: readonly (readonly number[])[];
export declare const HEXAGRAMS: readonly Hexagram[];
export declare function hexagramFromBits(bits:string):Hexagram;
export declare function hexagramByNumber(number:number):Hexagram|null;
export declare function hexagramFromLines(lines:number[]):Readonly<{original:Hexagram;transformed:Hexagram;changing:number[];lines:number[]}>;
export declare function castThreeCoins(random?:()=>number):number[];
