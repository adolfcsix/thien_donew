'use client';
import {useState} from 'react';
import {StudyTabs} from '@/components/study-tabs/study-tabs';
import {useWesternCatalog} from './use-western-catalog';
import css from './western-depth.module.css';

type Group='planets'|'signs'|'houses'|'aspects';
const groups=[{id:'planets',label:'10 thiên thể'},{id:'signs',label:'12 cung Hoàng đạo'},{id:'houses',label:'12 nhà'},{id:'aspects',label:'5 góc hợp'}];
const guide:Record<Group,{title:string;question:string;check:string;practice:string}>={
 planets:{title:'Bắt đầu từ chức năng',question:'Thiên thể này đại diện chức năng nào trong bộ đọc hiện tại?',check:'Đọc tên và chủ đề trước, rồi đối chiếu cung, nhà và các góc trong kết quả đã tính.',practice:'Viết một câu về nhu cầu hoặc cách hành động; thêm một phản ví dụ để tránh gán nhãn tính cách.'},
 signs:{title:'Đọc cách biểu đạt',question:'Chức năng thiên thể được mô tả theo cách nào khi nằm trong cung này?',check:'Nguyên tố và tính chất là các lớp của cùng phương pháp; không tự đồng nhất cung với nhà.',practice:'Ghép một thiên thể và một cung đã có trong lá số. Chỉ rõ phần nào là vị trí đo được, phần nào là ý nghĩa biểu tượng.'},
 houses:{title:'Đưa câu hỏi vào bối cảnh',question:'Lĩnh vực nào đang được xem xét và dữ liệu nào liên quan?',check:'Giữ hệ nhà đã chọn; xem cả chủ tinh và thiên thể hiện diện. Nhà trống vẫn có cung và chủ tinh.',practice:'Chọn một nhà trống và đặt một câu hỏi về lĩnh vực đó; không suy rằng lĩnh vực ấy vắng mặt trong đời sống.'},
 aspects:{title:'Đọc quan hệ giữa hai chức năng',question:'Hai thiên thể nào đang được nối và góc hợp có nằm trong orb đã chọn không?',check:'Đối chiếu góc mục tiêu và orb trên bảng số liệu. Màu đường nối không tự cho biết mức tốt/xấu.',practice:'Viết hai cách hiểu cho cùng một góc: một khả năng hỗ trợ và một căng thẳng cần điều chỉnh; không dự đoán sự kiện chắc chắn.'},
};
const fieldLabels:Record<string,string>={name:'Tên',theme:'Chủ đề',practice:'Thử trong thực tế',question:'Câu hỏi',caution:'Lưu ý',element:'Nguyên tố',modality:'Tính chất',style:'Cách biểu đạt',traditionalRuler:'Chủ tinh truyền thống',modernAlternative:'Lựa chọn hiện đại riêng',area:'Lĩnh vực',emptyNotice:'Nhà trống',reading:'Hướng đọc'};
const words:Record<string,string>={fire:'Lửa',earth:'Đất',air:'Khí',water:'Nước',cardinal:'Tiên phong',fixed:'Kiên định',mutable:'Linh hoạt'};
export function WesternKnowledge() {
  const [group,setGroup]=useState<Group>('planets');
  const [indices,setIndices]=useState<Record<Group,number>>({planets:0,signs:0,houses:0,aspects:0});
  const library=useWesternCatalog(group,indices[group]);
  const catalog=library.navigation?.[group]||[];
  const lesson=guide[group];
  return <section className={css.root} aria-label="Thư viện tri thức phương Tây">
    <h3>Thư viện 10 thiên thể · 12 cung · 12 nhà · 5 góc</h3>
    <p>Chọn nhóm rồi chọn mục. Mỗi nhóm giữ mục bạn vừa xem trong phiên mở trang; quay lại mục đã tải không gửi thêm yêu cầu.</p>
    <StudyTabs label="Nhóm tri thức Natal" items={groups} value={group} onChange={v=>setGroup(v as Group)}>
      <div className={css.knowledgeLayout}>
        <aside className={css.focus}><h4>{lesson.title}</h4><p>{lesson.question}</p><p><b>Đối chiếu:</b> {lesson.check}</p><p><b>Bài tập:</b> {lesson.practice}</p></aside>
        <div className={css.knowledgeItem} aria-busy={library.loading}>
          <label>Mục tri thức Natal<select aria-label="Mục tri thức Natal" disabled={!catalog.length} value={indices[group]}
            onChange={e=>setIndices(previous=>({...previous,[group]:Number(e.target.value)}))}>
            {catalog.map((item,i)=><option key={i} value={i}>{'name' in item?item.name:`Nhà ${item.number} · ${item.area}`}</option>)}
          </select></label>
          {library.loading&&<p role="status">Đang tải mục tri thức…</p>}
          {library.error&&<div role="alert"><p>{library.error}</p><button type="button" onClick={library.retry}>Thử lại mục tri thức</button></div>}
          {library.item&&<article aria-label="Nội dung mục tri thức">{Object.entries(library.item).filter(([key,value])=>typeof value==='string'&&key in fieldLabels).map(([key,value])=><p key={key}><b>{fieldLabels[key]}:</b> {words[String(value)]||library.navigation?.planets.find(p=>p.body===value)?.name||String(value)}</p>)}</article>}
        </div>
      </div>
    </StudyTabs>
    <p>Đây là hướng dẫn đọc biểu tượng. Nguồn và phạm vi phương pháp nằm trong phần luận Natal; không thay thế kết quả tính hoặc xác nhận khoa học về con người.</p>
  </section>;
}
