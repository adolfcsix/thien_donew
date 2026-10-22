export function compareYearLayers(birthBranch:number,annualBranch:number,layer:'birth'|'annual'):{scope:string;layer:'birth'|'annual';yearBranch:string;tuong:{name:string;branch:string}[];tue:{name:string;hanzi:string;branch:string}[];engineThaiTue:{name:string;branch:string}[]};
export function compareHour(hour:number):{hour:string;vanKhuc:string;engineThaiPhu:string;sourceThaiPhu:string;enginePhongCao:string;sourcePhongCao:string};
export const GATES:readonly string[];
export function auditDocket(data?:unknown):{errors:string[];records:number;missing:number;aliases:number};
