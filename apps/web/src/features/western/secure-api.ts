import {api} from '@/lib/api';
import type {NatalInput,NatalResult} from '@thiendo/astrology-engine/src/western-natal.cjs';
import type {WesternStudy} from '@thiendo/interpretation/src/western-depth.cjs';
import type {RelationshipReading} from '@thiendo/interpretation/src/relationship-reading.cjs';
export type WesternCatalog={navigation:{planets:{body:string;name:string}[];signs:{name:string}[];houses:{number:number;area:string}[];aspects:{angle:number;name:string}[];contexts:Record<string,{name:string}>};item:Record<string,unknown>};
function object(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v);}
function chart(v:unknown){return object(v)&&object(v.input)&&Array.isArray(v.planets)&&v.planets.length===10&&Array.isArray(v.houses)&&v.houses.length===12&&Array.isArray(v.aspects)&&typeof v.ascendant==='number'&&Number.isFinite(v.ascendant)&&typeof v.midheaven==='number'&&Number.isFinite(v.midheaven);}
function reading(v:unknown){return object(v)&&v.format==='thien-do.western-depth'&&object(v.method)&&object(v.context)&&object(v.axes)&&object(v.distribution)&&Array.isArray(v.planets)&&v.planets.length===10&&Array.isArray(v.houses)&&v.houses.length===12&&Array.isArray(v.aspects)&&Array.isArray(v.sources);}
const invalid=()=>new Error('Phản hồi tính toán chưa đầy đủ. Hãy thử lại; đầu vào của bạn vẫn được giữ.');
export async function calculateNatal(input:NatalInput,signal?:AbortSignal,pinReading=false){
 const value=await api<{result:NatalResult;report:WesternStudy}>('/api/calculations/western/natal',{method:'POST',body:{input,pinReading},signal,timeoutMs:30000});
 if(!chart(value.result)||!reading(value.report))throw invalid();return value;
}
export async function calculateRelationship(body:unknown,signal?:AbortSignal){
 const value=await api<{report:RelationshipReading}>('/api/calculations/western/relationship',{method:'POST',body,signal,timeoutMs:45000});const r=value.report;
 if(!object(r)||r.format!=='thien-do.western-relationship-result'||!chart(r.a)||!chart(r.b)||!Array.isArray(r.aspects)||!object(r.composite)||!object(r.overlayReadings)||!Array.isArray(r.synastryReadings)||!Array.isArray(r.compositeReadings)||!Array.isArray(r.compositeAspectReadings)||!Array.isArray(r.sources))throw invalid();return r;
}
export async function westernCatalog(tab='planets',index=0,signal?:AbortSignal){const r=await api<WesternCatalog>('/api/calculations/western/catalog?tab='+tab+'&index='+index,{signal,timeoutMs:15000});if(!object(r.navigation)||!object(r.item)||!['planets','signs','houses','aspects'].every(k=>Array.isArray(r.navigation[k as keyof typeof r.navigation]))||!object(r.navigation.contexts))throw invalid();return r;}
