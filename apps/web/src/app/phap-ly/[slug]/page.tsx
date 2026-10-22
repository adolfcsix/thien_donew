import type {Metadata} from 'next';
import {policies} from '@/features/portal/portal-content';
import PortalReader from '@/features/portal/portal-reader';
type Props={params:Promise<{slug:string}>};
export function generateStaticParams(){return policies.map(x=>({slug:x.slug}));}
export async function generateMetadata({params}:Props):Promise<Metadata>{const {slug}=await params;const item=policies.find(x=>x.slug===slug);return {title:item?.title||'Chính sách',description:item?.summary};}
export default async function Page({params}:Props){const {slug}=await params;return <PortalReader kind="policy" slug={slug}/>;}
