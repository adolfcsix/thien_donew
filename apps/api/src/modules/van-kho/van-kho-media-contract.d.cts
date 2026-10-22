export declare const LIMIT:number;
export declare function mediaType(content:Buffer,format:string):string;
export declare function imageReference(id:string):string;
export declare function mediaReferenced(body:unknown,id:string):boolean;
export declare function safeText(raw:unknown,max:number):string|null;
