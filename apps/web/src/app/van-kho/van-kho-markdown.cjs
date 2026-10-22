'use strict';
// Parse a conservative Markdown subset into DATA. Never render untrusted HTML.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function safeHref(v){if(typeof v!=='string'||v.length>500||/[\s\u0000-\u001f]/.test(v))return null;
 if(/^\/(?!\/)[a-zA-Z0-9/_#?.=%&+~-]*$/.test(v))return v;
 try{const url=new URL(v);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}}
function inline(raw){
 const out=[];const re=/!\[([^\]\n]{1,200})\]\(vk-image:([0-9a-f-]{36})\)|\[([^\]\n]{1,140})\]\(([^\s)]+)\)|`([^`\n]{1,300})`|\*\*([^*\n]{1,300})\*\*|\*([^*\n]{1,300})\*/g;
 let last=0,m;while((m=re.exec(raw))){if(m.index>last)out.push({type:'text',text:raw.slice(last,m.index)});
  if(m[1]!==undefined&&UUID.test(m[2]))out.push({type:'image',id:m[2].toLowerCase(),alt:m[1]});
  else if(m[3]!==undefined){const href=safeHref(m[4]);out.push(href?{type:'link',href,text:m[3]}:{type:'text',text:m[0]});}
  else if(m[5]!==undefined)out.push({type:'code',text:m[5]});
  else if(m[6]!==undefined)out.push({type:'bold',text:m[6]});
  else if(m[7]!==undefined)out.push({type:'em',text:m[7]});
  else out.push({type:'text',text:m[0]});last=re.lastIndex;
 }if(last<raw.length)out.push({type:'text',text:raw.slice(last)});return out;
}
function parseBlocks(source){
 const text=String(source||'').replace(/\r\n?/g,'\n'),lines=text.split('\n'),blocks=[],headings=[];
 const tableRow=(l)=>l.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(x=>x.trim()).slice(0,8);
 for(let i=0;i<lines.length;){const line=lines[i];if(!line.trim()){i++;continue;}
  const fence=/^```([\w+-]{0,32})\s*$/.exec(line);if(fence){const body=[];i++;while(i<lines.length&&!/^```\s*$/.test(lines[i]))body.push(lines[i++]);if(i<lines.length)i++;blocks.push({type:'codeblock',language:fence[1],text:body.join('\n')});continue;}
  const heading=/^(#{1,3})\s+(.+)$/.exec(line);if(heading){const id='section-'+headings.length;headings.push({id,text:heading[2]});blocks.push({type:'heading',level:heading[1].length,text:heading[2],id});i++;continue;}
  if(i+1<lines.length&&line.includes('|')&&/^\s*\|?\s*:?[-]{3,}:?\s*(\|\s*:?[-]{3,}:?\s*)+\|?\s*$/.test(lines[i+1])){
   const header=tableRow(line),rows=[];i+=2;while(i<lines.length&&lines[i].includes('|')&&rows.length<200&&lines[i].trim()){rows.push(tableRow(lines[i++]));}
   blocks.push({type:'table',header,rows});continue;
  }
  if(/^\s*([-*]|\d+\.)\s+/.test(line)){const rows=[],ordered=/^\s*\d+\./.test(line);while(i<lines.length&&/^\s*([-*]|\d+\.)\s+/.test(lines[i]))rows.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/,''));blocks.push({type:'list',ordered,rows});continue;}
  if(/^>\s?/.test(line)){const parts=[];while(i<lines.length&&/^>\s?/.test(lines[i]))parts.push(lines[i++].replace(/^>\s?/,''));blocks.push({type:'quote',text:parts.join(' ')});continue;}
  const parts=[];while(i<lines.length&&lines[i].trim()&&!/^```|^#{1,3}\s+|^>\s?/.test(lines[i]))parts.push(lines[i++]);if(parts.length)blocks.push({type:'paragraph',text:parts.join('\n')});else i++;
 }
 return {blocks,headings};
}
module.exports={inline,parseBlocks,safeHref};
