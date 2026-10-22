export declare const UUID:RegExp;
export declare const SLUG:RegExp;
export declare const SUBJECTS:Set<string>;
export type VanKhoDraft={slug:string;title:string;subject:string;body:string;excerpt:string;tags:string[];authorId:string|null};
export declare function draft(raw:unknown):VanKhoDraft;
export declare function shouldPublish(status:string,scheduledAt:string|null,now:number):boolean;
