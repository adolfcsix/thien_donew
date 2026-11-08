/** Temporary SVG image URLs belong to rasterization, not the download link. */
export async function svgToPng(blob:Blob,width:number,height:number,signal?:AbortSignal):Promise<Blob>{
 signal?.throwIfAborted();
 const url=URL.createObjectURL(blob);
 try{
  const image=new Image();image.src=url;await image.decode();signal?.throwIfAborted();
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d');if(!context)throw Error('Canvas unavailable');
  context.drawImage(image,0,0,width,height);
  const output=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));
  signal?.throwIfAborted();if(!output)throw Error('PNG unavailable');return output;
 }finally{URL.revokeObjectURL(url);}
}
