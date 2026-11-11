'use client';

import {useMemo,useState} from 'react';
import type {AstrologyResult} from '@thiendo/shared-types';
import {calculateLocal} from '@/lib/engine';
import {compareChartScenarios,nextCivilDate} from '../lib/late-zi-compare-model.cjs';
import {locateMovedStar} from '../lib/late-zi-star-navigation.cjs';
import styles from './late-zi-compare-panel.module.css';

type ScenarioSide={palace:string;isThan:boolean;mainStars:string[]};
type BranchDiff={
  branch:string;branchIndex:number;changed:boolean;
  before:ScenarioSide;after:ScenarioSide;
  movedBefore:string[];movedAfter:string[];
};
type FieldDiff={key:string;label:string;before:string;after:string;changed:boolean};
type MovedStar={name:string;from:string;to:string};
type StarFocus={name:string;from:string;to:string;fromIndex:number;toIndex:number;beforePalace:string;afterPalace:string};
type CompareReport={
  currentDate:string;alternativeDate:string;clock:string;
  branches:BranchDiff[];fields:FieldDiff[];
  movedStars:MovedStar[];movedCount:number;affectedBranches:number;
  currentSelected:true;hypotheticalOnly:true;writeOperations:false;
  timezoneVerified:false;schoolEquivalenceVerified:false;
};
const humanDate=(date:string)=>{
  const [year,month,day]=date.split('-');
  return [day,month,year].join('/');
};
function SideGrid({title,date,side,branches,selected,starFocus,onSelect}:{
 title:string;date:string;side:'before'|'after';branches:BranchDiff[];
 selected:number|null;starFocus:StarFocus|null;onSelect:(branch:number)=>void;
}) {
 return <section className={styles.side} aria-label={title}>
  <div className={styles.sideHead}>
   <span className={styles.sideOverline}>{side==='before'?'PHƯƠNG ÁN A · ĐANG DÙNG':'PHƯƠNG ÁN B · GIẢ ĐỊNH'}</span>
   <h4>{title}</h4><span className={styles.sideDate}>{humanDate(date)}</span>
  </div>
  <div className={styles.palaceGrid} data-ring={branches.length===12} role="group" aria-label={'Các địa chi của '+title}>
   {branches.length===12&&<div className={styles.centerSeal} aria-hidden="true">
    <span>THIÊN ĐỒ · TỬ VI</span>
    <strong>{side==='before'?'Ngày đã nhập':'Ngày giả định'}</strong>
    <small>{humanDate(date)}</small>
    <i>12 CUNG · ĐỊA BÀN</i>
   </div>}
   {branches.map(item=>{
    const cell=item[side],moved=side==='before'?item.movedBefore:item.movedAfter;
    const starEndpoint=starFocus&&item.branchIndex===(side==='before'?starFocus.fromIndex:starFocus.toIndex)
      ?(side==='before'?'source':'destination'):undefined;
    return <button type="button" className={styles.palace}
      key={item.branchIndex} data-branch={item.branchIndex} data-changed={item.changed} data-star-endpoint={starEndpoint} aria-pressed={selected===item.branchIndex}
      aria-label={item.branch+': '+cell.palace+(item.changed?', có khác biệt':'')+'. '+(cell.mainStars.length?cell.mainStars.join(', '):'Vô chính diệu')+(starEndpoint?', '+(side==='before'?'vị trí gốc của ':'vị trí giả định của ')+starFocus?.name:'')}
      onClick={()=>onSelect(item.branchIndex)}>
      <span className={styles.palaceTop}><b>{item.branch}</b><small>{item.changed?'Có thay đổi':'Giữ nguyên'}</small></span>
      <strong>{cell.palace}{cell.isThan?' · Thân':''}</strong>
      {starEndpoint&&<span className={styles.starEndpoint}>{side==='before'?'Vị trí A của ':'Vị trí B của '}{starFocus?.name}</span>}
      <span className={styles.stars}>{cell.mainStars.length
        ?cell.mainStars.map(name=><span key={name} data-moved={moved.includes(name)}>{name}</span>)
        :<span>Vô chính diệu</span>}</span>
    </button>;
   })}
  </div>
 </section>;
}
export function LateZiComparePanel({result}:{result:AstrologyResult}){
 const [onlyChanged,setOnlyChanged]=useState(false);
 const [selectedBranch,setSelectedBranch]=useState<number|null>(null);
 const [selectedStar,setSelectedStar]=useState<string|null>(null);
 const outcome=useMemo(()=>{
  try{
   if(result.hour!==23)return {report:null,error:'Chỉ có thể so sánh quy ước đổi ngày khi giờ nhập là 23:00–23:59.'};
   const next=nextCivilDate(result);
   if(!next)return {report:null,error:'Ngày sau nằm ngoài phạm vi hỗ trợ của bộ lịch (1900–2100).'};
   const alternative=calculateLocal({
    date:next,hour:result.hour,minute:result.minute,gender:result.gender,
    calendar:'solar',leap:false
   });
   const report=compareChartScenarios(result,alternative) as CompareReport;
   if(!report.currentSelected||!report.hypotheticalOnly||report.writeOperations||
     report.timezoneVerified||report.schoolEquivalenceVerified)
    throw Error('Báo cáo không đáp ứng ranh giới chỉ nghiên cứu.');
   return {report,error:''};
  }catch(error){
   return {report:null,error:error instanceof Error?error.message:'Không thể đối chiếu hai kịch bản.'};
  }
 },[result]);
 const report=outcome.report;
 const visible=report?(onlyChanged?report.branches.filter(x=>x.changed):report.branches):[];
 const starFocus=report&&selectedStar?(locateMovedStar(report,selectedStar) as StarFocus|null):null;
 const selectBranch=(branch:number)=>{setSelectedStar(null);setSelectedBranch(branch);};
 const active=report?.branches.find(x=>x.branchIndex===selectedBranch)
  ??report?.branches.find(x=>x.changed)??report?.branches[0];
 return <section className={styles.root} aria-labelledby="late-zi-panel-title" data-research-only="true">
  <header className={styles.heading}>
   <div><span className={styles.eyebrow}>SỔ TAY NGHIÊN CỨU · GIỜ TÝ CUỐI</span>
    <h3 id="late-zi-panel-title">Hai cách chọn ngày, hai địa bàn</h3></div>
   <span className={styles.researchTag}>Chỉ đối chiếu · không lưu</span>
  </header>
  <p className={styles.intro}>Cùng giờ sinh 23:00–23:59, có quy ước giữ ngày dân sự và quy ước tính sang ngày kế tiếp. Thiên Đồ hiện <strong>giữ ngày đã nhập</strong>; phương án B chỉ là giả định để thấy khác biệt, không tự thay dữ liệu.</p>
  {outcome.error&&<p role="alert" className={styles.error}>{outcome.error}</p>}
  {report&&<>
   <div className={styles.stats} aria-label="Tóm tắt các sai khác">
    <div><strong>{report.movedCount}<small>/14</small></strong><span>Chính tinh đổi địa chi</span></div>
    <div><strong>{report.affectedBranches}<small>/12</small></strong><span>Địa chi có nội dung đổi</span></div>
    <div><strong>{report.fields.filter(x=>x.changed).length}<small>/6</small></strong><span>Chỉ số tổng quan khác</span></div>
   </div>
   <p className={styles.legend}>Chính tinh có <strong>gạch chân chấm</strong> là sao đã chuyển địa chi giữa hai phương án; nhãn “Có thay đổi” còn tính cả cung và vị trí Thân.</p>
   <div className={styles.toolbar}>
    <p>Chọn một địa chi ở một trong hai bảng để đọc đồng thời hai kết quả.</p>
    <label className={styles.filter}><input type="checkbox" checked={onlyChanged}
      onChange={event=>{setOnlyChanged(event.target.checked);if(event.target.checked&&active&&!active.changed)setSelectedBranch(null);}}/>
      Chỉ xem địa chi thay đổi</label>
   </div>
   {visible.length===0
    ?<p className={styles.empty} role="status">Không có địa chi nào khác nội dung trong hai kịch bản này.</p>
    :<div className={styles.twoGrids}>
      <SideGrid title="Giữ ngày sinh đã nhập" date={report.currentDate} side="before"
       branches={visible} selected={active?.branchIndex??null} starFocus={starFocus} onSelect={selectBranch}/>
      <SideGrid title="Tính sang ngày sau" date={report.alternativeDate} side="after"
       branches={visible} selected={active?.branchIndex??null} starFocus={starFocus} onSelect={selectBranch}/>
     </div>}
   {active&&<section className={styles.focus} aria-live="polite" aria-label="Chi tiết địa chi đang chọn">
    <div className={styles.focusLabel}><span>ĐỊA CHI ĐANG XEM</span><h4>{active.branch}</h4>
     <span>{active.changed?'Có thay đổi giữa hai kịch bản':'Nội dung giữ nguyên'}</span></div>
    <div><small>Giữ ngày</small><b>{active.before.palace}{active.before.isThan?' · Thân':''}</b>
     <p>{active.before.mainStars.join(' · ')||'Vô chính diệu'}</p></div>
    <div><small>Sang ngày sau</small><b>{active.after.palace}{active.after.isThan?' · Thân':''}</b>
     <p>{active.after.mainStars.join(' · ')||'Vô chính diệu'}</p></div>
   </section>}
   <details className={styles.starAudit} data-testid="r40-star-transitions">
    <summary>Hành trình chính tinh · {report.movedCount}/14 sao đổi địa chi</summary>
    <p>Chỉ liệt kê 14 chính tinh. Mỗi dòng ghi địa chi của phương án A và địa chi giả định của phương án B; đây không phải bằng chứng chọn ngày nào đúng.</p>
    {report.movedStars.length
      ?<ul className={styles.starAuditList}>{report.movedStars.map(star=>
        <li key={star.name}>
         <strong><button type="button" className={styles.starPick} aria-pressed={starFocus?.name===star.name}
          aria-label={'Định vị '+star.name+' từ '+star.from+' sang '+star.to}
          onClick={()=>{setSelectedBranch(null);setSelectedStar(current=>current===star.name?null:star.name);}}>{star.name}</button></strong>
         <span><small>Giữ ngày</small><b>{star.from}</b></span>
         <span aria-hidden="true" className={styles.starArrow}>→</span>
         <span><small>Sang ngày sau</small><b>{star.to}</b></span>
        </li>)}</ul>
      :<p role="status" className={styles.starNoMovement}>Không chính tinh nào đổi địa chi ở hai phương án; các chỉ số khác như ngày âm vẫn có thể thay đổi.</p>}
   </details>
   {starFocus&&<p role="status" className={styles.starTraceStatus}>Đang định vị <strong>{starFocus.name}</strong>: phương án A ở <strong>{starFocus.from} ({starFocus.beforePalace})</strong>; phương án B ở <strong>{starFocus.to} ({starFocus.afterPalace})</strong>. Hai cung được đánh dấu trực tiếp trên địa bàn tương ứng.</p>}
   <p className={styles.scrollHint} id="late-zi-table-hint">Bảng có bốn cột. Trên điện thoại, vuốt bảng sang trái để xem cột “Sang ngày sau” và “Kết quả”. Có thể dùng bàn phím để cuộn khi vùng bảng được chọn.</p>
   <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Bảng so sánh chỉ số tổng quan" aria-describedby="late-zi-table-hint">
    <table className={styles.table}><caption>Đối chiếu sáu chỉ số của hai phương án</caption>
     <thead><tr><th scope="col">Chỉ số</th><th scope="col">Giữ ngày</th><th scope="col">Sang ngày sau</th><th scope="col">Kết quả</th></tr></thead>
     <tbody>{report.fields.map(field=><tr key={field.key} data-changed={field.changed}>
      <th scope="row">{field.label}</th><td>{field.before}</td><td>{field.after}</td>
      <td>{field.changed?'Khác':'Trùng'}</td></tr>)}</tbody>
    </table>
   </div>
   <p className={styles.notice}><strong>Lưu ý phương pháp.</strong> Hai địa bàn chỉ so sánh quy ước chuyển ngày dân sự, không kiểm chứng giờ mặt trời thực, múi giờ lịch sử hoặc đúng sai của từng trường phái. Không có thao tác lưu hoặc xác nhận phương án B; mọi chức năng lưu và xuất lá số ở phía trên vẫn sử dụng phương án A.</p>
  </>}
 </section>;
}
