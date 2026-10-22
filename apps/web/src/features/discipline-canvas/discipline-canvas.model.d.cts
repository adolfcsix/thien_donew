export type PalaceCell = {number:number;direction:string;trigram:string;symbol:string};
export type SectorItem = {name:string;han:string;center:number;direction:string};
export declare const LUO_SHU: readonly number[];
export declare const DIRECTIONS: readonly string[];
export declare function hexRows(bits:string, changingLine?:number|null): ReadonlyArray<{position:number;bit:string;moving:boolean}>;
export declare function palaceCells(palaces: readonly PalaceCell[]): ReadonlyArray<PalaceCell>;
export declare function directionGroups(sectors:readonly SectorItem[]): ReadonlyArray<{direction:string;sectors:ReadonlyArray<SectorItem>}>;
