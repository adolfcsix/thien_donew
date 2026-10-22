export type RestoreSessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export function getPending(storage:RestoreSessionStorage, userId:string, fingerprint:string):string|null;
export function reservePending(storage:RestoreSessionStorage, userId:string, fingerprint:string,
  createUUID:()=>string):{importId:string;resumed:boolean};
export function finishPending(storage:RestoreSessionStorage, userId:string, importId:string):void;
export function fingerprintEntries(entries:unknown[], cryptoObject:Pick<Crypto,'subtle'>):Promise<string>;
