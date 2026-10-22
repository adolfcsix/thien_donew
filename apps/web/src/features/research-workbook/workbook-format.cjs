'use strict';
function freeze(x){if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
const fact=(label,value,origin)=>({label,value:String(value),origin});
function workbook(discipline,title,status,sections=[],gaps=[],sources=[]){return freeze({kind:'research-workbook',discipline,title,status,sections,gaps,sources,outcome:null,score:null,forecast:null,notice:'Hồ sơ đối chiếu có điều kiện. Dữ kiện cấu trúc, giả thuyết và điều chưa kiểm chứng được trình bày riêng; chưa phải dự đoán sự kiện.'});}
function workbookMarkdown(report){
 if(!report||report.kind!=='research-workbook'||report.status!=='ready')throw new TypeError('Chỉ xuất hồ sơ đối chiếu đã sẵn sàng.');
 const clean=x=>String(x).replace(/[\r\n]+/g,' ').trim();
 const lines=[`# ${clean(report.title)}`,'',report.notice,'','Câu hỏi riêng tư không được đưa vào tệp này. Xuất do bạn chủ động chọn; không gửi đến máy chủ.'];
 for(const s of report.sections){lines.push('',`## ${clean(s.title)}`,'',...s.facts.map(f=>`- ${clean(f.label)}: ${clean(f.value)}. Căn cứ: ${clean(f.origin)}.`),'',s.explanation,'',...s.questions.map(q=>`- Cần kiểm tra: ${clean(q)}`));}
 lines.push('','## Điều chưa hoàn tất','',...report.gaps.map(g=>`- ${clean(g)}`),'','## Nguồn tham khảo','',...report.sources.map(s=>`- ${clean(s.title)}: ${s.url}`),'','Không có điểm cát/hung, xác suất hoặc kết quả sự kiện.');
 return lines.join('\n')+'\n';
}
module.exports={freeze,fact,workbook,workbookMarkdown};
