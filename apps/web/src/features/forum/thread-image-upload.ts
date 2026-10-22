import {webpPixels} from './webp-pixels.cjs';
/** Converts a local picture into bounded WebP pixels and removes ancillary metadata. */
export async function prepareThreadImage(file: File): Promise<Blob> {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024 || file.size === 0) {
    throw new Error('Chỉ nhận JPEG, PNG hoặc WebP tối đa 12 MB trước khi tối ưu');
  }
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve,reject)=>{
      image.onload=()=>resolve();image.onerror=()=>reject(new Error('Không đọc được ảnh'));
      image.src=source;
    });
    if(!image.naturalWidth || !image.naturalHeight || image.naturalWidth>12000 || image.naturalHeight>12000 || image.naturalWidth*image.naturalHeight>60_000_000) throw new Error('Kích thước ảnh không hợp lệ');
    const ratio = Math.min(1,1200/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
    const context=canvas.getContext('2d');if(!context)throw new Error('Trình duyệt không hỗ trợ xử lý ảnh');
    context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
    context.drawImage(image,0,0,canvas.width,canvas.height);
    for(const quality of [.86,.75,.63,.5,.36]) {
      const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',quality));
      if(blob && blob.type==='image/webp') {
        const pixels=webpPixels(new Uint8Array(await blob.arrayBuffer()));
        if(pixels.byteLength<=1024*1024 && pixels.byteLength>=45) return new Blob([pixels],{type:'image/webp'});
      }
    }
    throw new Error('Ảnh quá phức tạp để lưu trong giới hạn 1 MB; hãy chọn ảnh khác');
  } finally {URL.revokeObjectURL(source)}
}
export async function uploadThreadImage(blob: Blob):Promise<string> {
  const response=await fetch('/api/forum/media',{method:'POST',headers:{'Content-Type':blob.type},body:blob,credentials:'same-origin'});
  const result:unknown=await response.json().catch(()=>null);
  const value=result&&typeof result==='object'&&!Array.isArray(result)?result as Record<string,unknown>:{};
  if(!response.ok) throw new Error(typeof value.message==='string'?value.message:'Không thể tải ảnh lên');
  if(typeof value.id!=='string'||!/^[-0-9a-f]{36}$/i.test(value.id))throw new Error('Máy chủ không xác nhận ảnh đã tải');
  return value.id;
}
