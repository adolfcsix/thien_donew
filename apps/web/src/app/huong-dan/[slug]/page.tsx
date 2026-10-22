import type {Metadata} from 'next';
import {guides} from '@/features/portal/portal-content';
import PortalReader from '@/features/portal/portal-reader';
type Props={params:Promise<{slug:string}>};
export function generateStaticParams(){return guides.map(x=>({slug:x.slug}));}
export async function generateMetadata({params}:Props):Promise<Metadata>{const {slug}=await params;const item=guides.find(x=>x.slug===slug);return {title:item?.title||'Hướng dẫn',description:item?.summary};}
export default async function Page({params}:Props){const {slug}=await params;return <PortalReader kind="guide" slug={slug}/>;}
