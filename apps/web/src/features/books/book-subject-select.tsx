import {subjectLabel} from '@/lib/content-labels';
const subjects=['tu-vi','bat-tu','kinh-dich','mai-hoa','luc-hao','ky-mon','lich-phap','phong-thuy','chiem-tinh','tarot','than-so-hoc','nghien-cuu','khac'];
export function BookSubjectSelect({value,onChange}:{value:string;onChange:(value:string)=>void}){return <select aria-label="Bộ môn" required value={value} onChange={e=>onChange(e.target.value)}>{subjects.map(id=><option key={id} value={id}>{subjectLabel(id)}</option>)}</select>;}
