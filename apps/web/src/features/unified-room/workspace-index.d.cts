export type WorkspaceResult={id:string;kind:'profile'|'chart'|'study'|'tool';title:string;subtitle:string;href:string;search:string};
export function fold(value:unknown):string;
export function workspaceIndex(input:{profiles?:ReadonlyArray<Record<string,any>>;charts?:ReadonlyArray<Record<string,any>>;entries?:ReadonlyArray<Record<string,any>>;navigation?:ReadonlyArray<Record<string,any>>}):WorkspaceResult[];
export function searchWorkspace(index:WorkspaceResult[],query:string,options?:{kind?:string;limit?:number}):WorkspaceResult[];
