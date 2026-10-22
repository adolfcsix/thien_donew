'use client';
import {Fragment} from 'react';
import styles from './van-kho.module.css';
import {parseBlocks,inline} from './van-kho-markdown.cjs';
type Inline={type:string;text?:string;href?:string;id?:string;alt?:string};
type Block={type:string;id?:string;level?:number;text?:string;language?:string;header?:string[];rows?:string[]|string[][];ordered?:boolean};
type ParseResult={blocks:Block[];headings:{id:string;text:string}[]};
export function formattedBlocks(source:string){return parseBlocks(source) as ParseResult;}
export default function VanKhoMarkdown({body,slug,id,preview=false}:{body:string;slug:string;id?:string;preview?:boolean}){
 const {blocks}=formattedBlocks(body);
 function nodes(text:string){return (inline(text) as Inline[]).map((item,index)=>{
  const key=index;
  if(item.type==='bold')return <strong key={key}>{item.text}</strong>;
  if(item.type==='em')return <em key={key}>{item.text}</em>;
  if(item.type==='code')return <code key={key}>{item.text}</code>;
  if(item.type==='link')return <a key={key} className={styles.link} href={item.href} rel="noopener noreferrer" target={item.href?.startsWith('https:')?'_blank':undefined}>{item.text}</a>;
  if(item.type==='image'&&item.id){const url=preview&&id?`/api/van-kho/admin/documents/${encodeURIComponent(id)}/images/${encodeURIComponent(item.id)}`:`/api/van-kho/${encodeURIComponent(slug)}/images/${encodeURIComponent(item.id)}`;return <figure key={key} className={styles.figure}><img src={url} alt={item.alt||'Minh họa nghiên cứu'} loading="lazy"/><figcaption>{item.alt}</figcaption></figure>;}
  return <Fragment key={key}>{item.text}</Fragment>;
 });}
 return <div className={styles.prose}>{blocks.map((b,i)=>{
  if(b.type==='heading'){const name=b.text||'';return b.level===1?<h2 id={b.id} key={i}>{nodes(name)}</h2>:b.level===2?<h3 id={b.id} key={i}>{nodes(name)}</h3>:<h4 id={b.id} key={i}>{nodes(name)}</h4>;}
  if(b.type==='codeblock')return <pre key={i} className={styles.codeblock}><code>{b.text}</code></pre>;
  if(b.type==='quote')return <blockquote key={i}>{nodes(b.text||'')}</blockquote>;
  if(b.type==='list')return b.ordered?<ol key={i}>{(b.rows as string[]).map((r,j)=><li key={j}>{nodes(r)}</li>)}</ol>:<ul key={i}>{(b.rows as string[]).map((r,j)=><li key={j}>{nodes(r)}</li>)}</ul>;
  if(b.type==='table')return <div key={i} className={styles.tableScroll} role="region" aria-label="Bảng dữ liệu trong bài viết" tabIndex={0}><table><thead><tr>{b.header?.map((h,j)=><th key={j} scope="col">{nodes(h)}</th>)}</tr></thead><tbody>{(b.rows as string[][]).map((row,j)=><tr key={j}>{b.header?.map((_,k)=><td key={k}>{nodes(row[k]||'')}</td>)}</tr>)}</tbody></table></div>;
  return <p key={i}>{nodes(b.text||'')}</p>;
 })}</div>;
}
