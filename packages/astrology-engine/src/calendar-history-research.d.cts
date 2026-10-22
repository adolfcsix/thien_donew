export const METHOD:string;
export function leap(year:number,style:'gregorian'|'julian'):boolean;
export function toJdn(year:number,month:number,day:number,style:'gregorian'|'julian'):number;
export function fromJdn(jdn:number,style:'gregorian'|'julian'):{year:number;month:number;day:number;style:string};
export function compare(input:unknown):{method:string;researchOnly:true;referenceCalendar:string;source:{year:number;month:number;day:number};jdn:number;sameDayInOtherStyle:{year:number;month:number;day:number;style:string};weekdayIndex:number;limitation:string};
