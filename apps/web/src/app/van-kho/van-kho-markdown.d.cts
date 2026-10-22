export type InlinePart={type:string;text?:string;href?:string;id?:string;alt?:string};
export type MarkdownBlock={type:string;id?:string;level?:number;text?:string;language?:string;header?:string[];rows?:string[]|string[][];ordered?:boolean};
export declare function inline(text:string):InlinePart[];
export declare function parseBlocks(text:string):{blocks:MarkdownBlock[];headings:{id:string;text:string}[]};
export declare function safeHref(url:string):string|null;
