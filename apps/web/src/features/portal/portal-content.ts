import data from '@/lib/portal-v11163-content.json';
export type PortalKind='guide'|'policy';
export type PortalEntry={kind:PortalKind;slug:string;title:string;summary:string;tool:string;related:string;body:string;reviewStatus:string;sections:{title:string;body:string}[]};
export const entries=data as PortalEntry[];
export const guides=entries.filter(item=>item.kind==='guide');
export const policies=entries.filter(item=>item.kind==='policy');
export function pathFor(item:{kind:PortalKind;slug:string}){return (item.kind==='guide'?'/huong-dan/':'/phap-ly/')+encodeURIComponent(item.slug);}
export function normalized(text:string){return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().trim();}
