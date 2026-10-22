export interface BirthProfileDraft {
 name:string;date:string;hour:number|null;minute:number|null;calendar:'solar'|'lunar';leap:boolean;
 gender:'Nam'|'Nữ'|null;timeZone:string;birthPlace:string;latitude:number|null;longitude:number|null;
 timeAccuracy:'exact'|'estimated'|'unknown';notes:string;
}
export type BirthProfile=BirthProfileDraft & {id:string;createdAt:string;updatedAt:string};
