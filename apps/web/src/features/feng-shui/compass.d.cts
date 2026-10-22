export type Mountain={name:string;han:string;direction:string;trigram:string;center:number;start:number;end:number};
export declare const SECTORS:readonly Mountain[];
export declare function normalizeDegrees(degrees:number):number;
export declare function mountainAt(degrees:number):Mountain;
export declare function orientation(degrees:number):Readonly<{facingDegrees:number;sittingDegrees:number;facing:Mountain;sitting:Mountain;boundaryDistance:number}>;
