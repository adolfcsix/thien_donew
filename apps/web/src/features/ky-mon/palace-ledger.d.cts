import type {BaseFormation} from './formation.cjs';
import type {RotatingHourPlate} from './hour-plate.cjs';
export type EvidenceField={key:string;label:string;value:string|null;status:'present'|'absent'|'not-computed'|'convention';explanation:string;sourcePalace:number|null};
export type PalaceEvidence={number:number;direction:string;trigram:string;element:string;fields:readonly EvidenceField[];homeStar:string;homeDoor:string|null;chiefStarLanding:boolean;chiefDoorLanding:boolean;lodgedTianQin:boolean};
export type PalaceLedger={status:'research-only'|'earth-only';method:string;entries:readonly PalaceEvidence[];byPalace:Readonly<Record<number,PalaceEvidence>>;steps:readonly string[];note:string};
export declare function buildPalaceLedger(base:BaseFormation,plate?:RotatingHourPlate|null):PalaceLedger;
