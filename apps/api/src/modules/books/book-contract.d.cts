export type BookInput={slug:string;title:string;author:string;subject:string;accessLevel:'free'|'member'|'pro';status:'draft'|'published'|'hidden';featured:boolean;publishedYear:number|null;tags:string[];publisher:string;synopsis:string;licenseName:string;licenseProof:string};
export declare function bookInput(raw:unknown):BookInput;
export declare function canRead(access:string,context?:{signedIn?:boolean;pro?:boolean}):boolean;
export declare function sniff(buffer:Buffer,kind:string,declared:string):string;
export declare function epubChapters(buffer:Buffer):Array<{index:number;title:string;text:string;truncated:boolean;originalCharacters:number}>;
export declare const SLUG:RegExp;
export declare const UUID:RegExp;
export declare const SUBJECTS:Set<string>;
