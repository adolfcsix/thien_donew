import type {BookForm} from './admin-api';
/** Compare editable metadata only, not server timestamps or submission counters. */
export function bookFingerprint(form:BookForm,tagText?:string):string {
 const fields=['slug','title','author','publisher','publishedYear','synopsis','subject','tags','accessLevel','licenseName','licenseProof','status','featured'] as const;
 return JSON.stringify([fields.map(key=>form[key]),tagText]);
}
/** The selected file is cleared only after the server confirms these exact bytes/kind. */
export function bookUploadConfirmed(value:unknown,bytes:number,kind:string,format:string):boolean {
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const receipt=value as Record<string,unknown>;
 return receipt.uploaded===true&&receipt.size===bytes&&receipt.kind===kind&&receipt.format===format;
}
