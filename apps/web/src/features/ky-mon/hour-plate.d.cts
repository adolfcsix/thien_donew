import type {BaseFormation} from './formation.cjs';
export type RotatingPalace={
 number:number;earthStem:string;heavenStem:string|null;star:string|null;door:string|null;deity:string|null;
 starFromPalace:number|null;doorFromPalace:number|null;chiefStarLanding:boolean;chiefDoorLanding:boolean;
 voidAtPalace:boolean;lodgedTianQin:boolean;
};
export type RotatingHourPlate={
 method:string;hourName:string;trueHourStem:string;hourStemPalace:number;
 chiefStar:string;chiefDoor:string;chiefStarLanding:number;chiefDoorLanding:number;
 starShift:number;doorShift:number;centerEarthStem:string;spiritDirection:'thuận'|'nghịch';
 palaces:readonly RotatingPalace[];byPalace:Readonly<Record<number,RotatingPalace>>;
 status:'rotating-plate-convention';limitations:readonly string[];
};
export declare const OUTER:readonly number[];
export declare const CENTER_HOST:2;
export declare function rotateHomeToTarget(homePalace:number,targetPalace:number):number;
export declare function buildRotatingHourPlate(base:BaseFormation):RotatingHourPlate;
