export type Element = Readonly<{id:string;name:string;han:string;symbol:string;theme:string;image:string;color:string}>;
export type Relationship = {kind:string;from:Element;to:Element;label:string;summary:string;direction:string|null};
export declare const ELEMENTS:readonly Element[];
export declare const SHENG:Readonly<Record<string,string>>;
export declare const KE:Readonly<Record<string,string>>;
export declare function elementById(id:string):Element|null;
export declare function compareElements(a:string,b:string):Relationship;
