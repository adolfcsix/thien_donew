'use client';
import {useMemo,useState} from 'react';
import {lifeGua,directionsForGua,houseGua,compareGua} from './eight-mansions.cjs';
import {periodStarChart,annualStarChart,periodByConfirmedSolarYear,STARS} from './flying-stars.cjs';
import type {StarPalace} from './flying-stars.cjs';
import {natalStarChart} from './natal-flying-stars.cjs';
import {ZONES,ROOM_TYPES,blankFloorPlan,assignRoom} from './floor-plan.cjs';
import {ATLAS,ELEMENT_BY_QI} from './great-hexagrams.cjs';
import {measurementAudit,eightMansionsDirectionAudit} from './feng-shui-audit.cjs';
import type {orientation} from './compass.cjs';
import styles from './feng-shui-study.module.css';

type OrientationResult = ReturnType<typeof orientation> | null;

/** Không sử dụng kết luận cát hung làm tư vấn y tế, tài chính hay kiến trúc. */
export function FengShuiStudy({orientationResult}:{orientationResult:OrientationResult}){
 const [yearText,setYearText]=useState('1985');
 const [sexMethod,setSexMethod]=useState<'male'|'female'>('male');
 const [reference,setReference]=useState<'person'|'house'>('house');
 const [period,setPeriod]=useState(9);
 const [annualYear,setAnnualYear]=useState(2026);
 const [activePalace,setActivePalace]=useState(5);
 const [showPeriod,setShowPeriod]=useState(true);
 const [showAnnual,setShowAnnual]=useState(true);
 const [showMountain,setShowMountain]=useState(true);
 const [showFacing,setShowFacing]=useState(true);
 const [plan,setPlan]=useState<Readonly<Record<number,string>>>(()=>blankFloorPlan());
 const [activeZone,setActiveZone]=useState(5);
 const [accuracyText,setAccuracyText]=useState('0.5');
 const [showAtlas,setShowAtlas]=useState(false);
 const year=Number(yearText);
 const life=useMemo(()=>yearText.trim()!==''&&Number.isInteger(year)&&year>=1900&&year<=2099?lifeGua(year,sexMethod):null,[yearText,year,sexMethod]);
 const house=useMemo(()=>orientationResult?houseGua(orientationResult.sitting.trigram):null,[orientationResult]);
 const directions=useMemo(()=>reference==='house'&&house?directionsForGua(house.number):reference==='person'&&life?directionsForGua(life.number):[],[reference,house,life]);
 const comparison=useMemo(()=>house&&life?compareGua(life.number,house.number):null,[house,life]);
 const periodChart=useMemo(()=>periodStarChart(period),[period]);
 const yearChart=useMemo(()=>annualStarChart(annualYear),[annualYear]);
 const natal=useMemo(()=>orientationResult?natalStarChart(period,orientationResult.facingDegrees):null,[period,orientationResult]);
 const activeNatal=natal?.positions.find(x=>x.number===activePalace);
 const selectedZone=ZONES.find(z=>z.palace===activeZone);
 const zoneRelation=directions.find(x=>x.direction===selectedZone?.direction);
 const currentPeriod=useMemo(()=>periodByConfirmedSolarYear(annualYear),[annualYear]);
 const activePeriod=periodChart.positions.find(x=>x.number===activePalace);
 const activeAnnual=yearChart.positions.find(x=>x.number===activePalace);
 const accuracy=accuracyText.trim()===''?NaN:Number(accuracyText);
 const validAccuracy=Number.isFinite(accuracy)&&accuracy>=0&&accuracy<=7.5;
 const audit=useMemo(()=>orientationResult&&validAccuracy?measurementAudit(orientationResult.facingDegrees,period,accuracy):null,[orientationResult,period,accuracy,validAccuracy]);
 const guaPair=audit?.great??null;
 const batTrachComparison=useMemo(()=>house&&life&&activePeriod?.direction&&activePeriod.number!==5?eightMansionsDirectionAudit(house.name,life.solarYear,sexMethod,activePeriod.direction):null,[house,life,sexMethod,activePeriod]);
 return <div className={styles.sections}>
  <section className={styles.section} aria-labelledby="feng-bat-trach">
   <header className={styles.heading}><span className={styles.eyebrow}>04 / 八宅 · BÁT TRẠCH</span><h2 id="feng-bat-trach">Mệnh quái &amp; trạch quái</h2><p>Tách biệt năm sinh theo tiết khí (Mệnh quái) với hướng tọa của ngôi nhà (Trạch quái). Có thể đối chiếu tám phương theo từng quái, không trộn hai phép tính.</p></header>
   <div className={styles.twoColumns}>
    <div className={styles.controlPanel}>
     <div className={styles.formRow}>
      <label>Năm sinh <strong>đã quy về sau Lập Xuân</strong><input type="number" min="1900" max="2099" step="1" value={yearText} onChange={e=>setYearText(e.target.value)} aria-invalid={!life}/></label>
      <label>Quy ước tính truyền thống<select value={sexMethod} onChange={e=>setSexMethod(e.target.value as 'male'|'female')}><option value="male">Nam</option><option value="female">Nữ</option></select></label>
     </div>
     <p className={styles.hint}>Nhập năm tiết khí đã xác nhận, không nhất thiết bằng năm dương lịch ghi trên giấy tờ nếu sinh trước Lập Xuân. Phép tính sử dụng hai quy ước nam/nữ truyền thống, không suy luận giới tính của người dùng.</p>
     {!life&&<p className={styles.warning} role="alert">Nhập năm nguyên từ 1900 đến 2099 theo tiết Lập Xuân.</p>}
     <div className={styles.summaryCards}>
      <div><span>Mệnh quái</span><strong>{life?`${life.number} · ${life.name}`:'—'}</strong><small>{life?`${life.group} · ${life.element}`:'Chưa đủ dữ kiện'}</small></div>
      <div><span>Trạch quái (theo tọa)</span><strong>{house?`${house.number} · ${house.name}`:'—'}</strong><small>{house?`${house.group} · ${house.direction}`:'Chưa có số đo hướng'}</small></div>
     </div>
     {life?.substitution&&<p className={styles.hint}>Kết quả gốc là quái 5 (Trung cung), quy ước chuyển thành quái {life.number} theo phép tính {sexMethod==='male'?'nam':'nữ'}.</p>}
     {orientationResult&&orientationResult.boundaryDistance<1&&<p className={styles.warning} role="status">Số đo đang gần ranh giới sơn (dưới 1°). Hãy đo lại ở nhiều vị trí trước khi sử dụng Trạch quái.</p>}
     {comparison&&<p className={styles.hint}>Đối chiếu Đông/Tây tứ: <strong>{comparison.sameGroup?'Cùng nhóm':'Khác nhóm'}</strong>. Đây là thuật ngữ phân loại của Bát Trạch, không phải kết luận chất lượng nhà ở.</p>}
    </div>
    <div className={styles.controlPanel}>
     <div className={styles.toggle} role="group" aria-label="Đổi hệ quy chiếu tám phương"><button type="button" aria-pressed={reference==='house'} onClick={()=>setReference('house')}>Theo trạch quái</button><button type="button" aria-pressed={reference==='person'} onClick={()=>setReference('person')}>Theo mệnh quái</button></div>
     <p className={styles.hint}>{reference==='house'?'Dựa theo quái tọa của nhà hiện đo.':'Dựa theo Mệnh quái của năm sinh đã xác nhận.'} Bốn nhãn cát và bốn nhãn hung là cách gọi cổ truyền, không phải phán đoán thực nghiệm.</p>
     {directions.length===8?<div className={styles.directionGrid}>{directions.map(item=><div key={item.direction} className={styles.direction} data-kind={item.kind}><small>{item.direction}</small><strong>{item.label}</strong><span>{item.kind==='cát'?'Nhóm cát truyền thống':'Nhóm hung truyền thống'}</span></div>)}</div>:<div className={styles.empty}>Cần có {reference==='house'?'hướng la bàn hợp lệ':'năm sinh tiết khí hợp lệ'} để lập tám phương.</div>}
    </div>
   </div>
  </section>
  <section className={styles.section} aria-labelledby="feng-phi-tinh">
   <header className={styles.heading}><span className={styles.eyebrow}>05 / 玄空飛星 · HUYỀN KHÔNG</span><h2 id="feng-phi-tinh">Địa bàn vận &amp; sao lưu niên</h2><p>Lập bốn lớp sao khác nhau trên Cửu cung Lạc Thư: Vận tinh, Sơn tinh, Hướng tinh theo phép Hạ quái và sao lưu niên. Sơn tinh/Hướng tinh chỉ được lập khi đã nhập hướng mặt quay ra hợp lệ.</p></header>
   <div className={styles.formRowWide}>
    <label>Vận nhà đã xác nhận<select value={period} onChange={e=>setPeriod(Number(e.target.value))}>{Array.from({length:9},(_,i)=><option value={i+1} key={i}>Vận {i+1}</option>)}</select></label>
    <label>Năm lưu niên (tính từ Lập Xuân)<select value={annualYear} onChange={e=>setAnnualYear(Number(e.target.value))}>{Array.from({length:20},(_,i)=><option key={i} value={2024+i}>{2024+i}</option>)}</select></label>
    <div className={styles.layerSwitch}><label><input type="checkbox" checked={showPeriod} onChange={e=>setShowPeriod(e.target.checked)}/> Hiện vận tinh</label><label><input type="checkbox" checked={showAnnual} onChange={e=>setShowAnnual(e.target.checked)}/> Hiện sao lưu niên</label><label><input type="checkbox" checked={showMountain} onChange={e=>setShowMountain(e.target.checked)}/> Hiện Sơn tinh</label><label><input type="checkbox" checked={showFacing} onChange={e=>setShowFacing(e.target.checked)}/> Hiện Hướng tinh</label></div>
   </div>
   <p className={styles.hint}>Vận {period} được chọn thủ công theo thời điểm xây/cải tạo có hiệu lực; năm {annualYear} là năm tính từ Lập Xuân. Theo chu kỳ, năm {annualYear} thuộc vận {currentPeriod.period}, nhưng không tự đổi vận đã chọn cho ngôi nhà.</p>
   {!natal&&<p className={styles.warning} role="status">Chưa có số đo hướng hợp lệ nên chưa lập Sơn tinh/Hướng tinh. Vận tinh và niên tinh vẫn có thể xem độc lập.</p>}
   {natal?.boundaryWarning&&<p className={styles.warning} role="status">{natal.boundaryWarning}</p>}
   {audit&&<div className={styles.auditSummary}><strong>{audit.structure.label} · {audit.structure.han}</strong><span>{audit.structure.description}. Đây là phân loại hình thế sao theo bốn mẫu, không phải điểm cát/hung.</span></div>}
   {natal&&<p className={styles.hint}>Bàn Hạ quái tham khảo: tọa {natal.sitting.name} (sơn thứ {natal.sitting.rank}) · hướng {natal.facing.name} (sơn thứ {natal.facing.rank}). Sơn tinh nhập trung {natal.mountain.seed} ({natal.mountain.direction==='forward'?'thuận':'nghịch'}) · Hướng tinh nhập trung {natal.facingStar.seed} ({natal.facingStar.direction==='forward'?'thuận':'nghịch'}).</p>}
   <div className={styles.twoColumns}>
    <div className={styles.plate} role="group" aria-label="Cửu cung Phi Tinh, Nam phía trên">
     {periodChart.positions.map((p:StarPalace)=>{
      const yearP=yearChart.positions.find(x=>x.number===p.number);
      return <button key={p.number} className={styles.palace} type="button" aria-pressed={p.number===activePalace} onClick={()=>setActivePalace(p.number)} aria-label={`${p.direction}, cung ${p.number}, vận tinh ${p.star}, Sơn tinh ${natal?.positions.find(x=>x.number===p.number)?.mountainStar??'chưa có'}, Hướng tinh ${natal?.positions.find(x=>x.number===p.number)?.waterStar??'chưa có'}, lưu niên ${yearP?.star}`}>
       <small>{p.direction} · {p.number}</small>
       <div className={styles.natalStars}>{showMountain&&natal&&<span title="Sơn tinh" className={styles.mountainStar}>{natal.positions.find(x=>x.number===p.number)?.mountainStar}</span>}{showFacing&&natal&&<span title="Hướng tinh" className={styles.facingStar}>{natal.positions.find(x=>x.number===p.number)?.waterStar}</span>}</div>
       <div className={styles.stars}>{showPeriod&&<span title="Vận tinh" className={styles.baseStar}>{p.star}</span>}{showAnnual&&<span title="Lưu niên" className={styles.annualStar}>{yearP?.star}</span>}</div>
       <span>{p.trigram}</span>
      </button>;
     })}
     <div className={styles.legend}><span><i className={styles.baseDot}/> Vận tinh</span><span><i className={styles.annualDot}/> Lưu niên</span><span><i className={styles.mountainDot}/> Sơn tinh</span><span><i className={styles.facingDot}/> Hướng tinh</span><span>Nam phía trên</span></div>
    </div>
    <div className={styles.controlPanel} aria-live="polite">
     <span className={styles.eyebrow}>VẾT TÍNH / CUNG ĐÃ CHỌN</span>
     <h3>{activePeriod?.direction} · cung {activePalace}</h3>
     <div className={styles.detail}><span>Vận tinh</span><strong>{activePeriod?.star} · {activePeriod?.name}</strong><small>Vận {period} nhập trung 5, bay thuận Lạc Thư, bước {activePeriod?.step}</small></div>
     {natal&&<><div className={styles.detail}><span>Sơn tinh / tọa</span><strong>{activeNatal?.mountainStar} · {activeNatal?.mountainName}</strong><small>Sao nhập trung {natal.mountain.seed}, {natal.mountain.direction==='forward'?'bay thuận':'bay nghịch'}; quái gốc {natal.mountain.homePalace} / sơn {natal.mountain.referenceMountain} · {natal.mountain.polarity==='yang'?'Dương':'Âm'}.</small></div>
     <div className={styles.detail}><span>Hướng tinh / mặt quay ra</span><strong>{activeNatal?.waterStar} · {activeNatal?.waterName}</strong><small>Sao nhập trung {natal.facingStar.seed}, {natal.facingStar.direction==='forward'?'bay thuận':'bay nghịch'}; quái gốc {natal.facingStar.homePalace} / sơn {natal.facingStar.referenceMountain} · {natal.facingStar.polarity==='yang'?'Dương':'Âm'}.</small></div></>}
     <div className={styles.detail}><span>Sao lưu niên {annualYear}</span><strong>{activeAnnual?.star} · {activeAnnual?.name}</strong><small>Niên tinh {yearChart.center} nhập trung 5, bay thuận, bước {activeAnnual?.step}</small></div>
     <div className={styles.detail}><span>Đường bay Lạc Thư</span><strong className={styles.path}>Trung 5 → Càn 6 → Đoài 7 → Cấn 8 → Ly 9 → Khảm 1 → Khôn 2 → Chấn 3 → Tốn 4</strong></div>
     <p className={styles.hint}>Sao {activeAnnual?.star} thuộc {STARS[activeAnnual?.star||1].element} theo hệ biểu tượng Ngũ hành. Chưa suy luận cát hung của phòng, hướng cửa hay năm cải tạo.</p>
    </div>
   </div>
   <details className={styles.caveat}><summary>Những phần chưa đủ điều kiện tính</summary><p>Tam bàn riêng cho từng ngôi nhà cần thời điểm nhập vận, sơn tọa–hướng 24 sơn, âm dương nguyên long và quy tắc trường phái; công cụ đã an Sơn tinh/Hướng tinh bằng phép Hạ quái thông thường, nhưng chưa tính Thế quái (quẻ thay thế), kiêm hướng, nguyệt tinh, không chấm điểm hoặc đưa kết luận thực tế về nhà cửa. Ranh giới Lập Xuân cần xác minh thời điểm chính xác khi ở sát giao tiết.</p></details>
  </section>
  <section className={styles.section} aria-labelledby="feng-floorplan">
   <header className={styles.heading}><span className={styles.eyebrow}>06 / 八宅 · SƠ ĐỒ PHÂN KHU</span><h2 id="feng-floorplan">Bát Trạch trên sơ đồ chín cung tương tác</h2><p>Chọn từng ô để gán khu vực chức năng rồi xem phương hướng tương ứng. Đây là mô hình chín cung định hướng, <strong>không phải bản vẽ mặt bằng theo kích thước thật</strong> và không xác định vị trí phòng từ ảnh chụp.</p></header>
   <div className={styles.twoColumns}>
    <div className={styles.floorGrid} role="group" aria-label="Sơ đồ phân khu chín cung, Nam phía trên">
     {ZONES.map(z=>{
      const relation=directions.find(d=>d.direction===z.direction);
      return <button key={z.palace} type="button" className={styles.floorCell} aria-pressed={z.palace===activeZone} onClick={()=>setActiveZone(z.palace)} data-kind={relation?.kind||'center'}>
       <small>{z.direction} · {z.palace}</small><strong>{plan[z.palace]}</strong><span>{relation?.label??'Trung cung'}</span>
      </button>;
     })}
     <p className={styles.floorLegend}>Nam ở trên · Đông bên trái · Không tự xoay theo hình dạng ngôi nhà</p>
    </div>
    <div className={styles.controlPanel} aria-live="polite">
     <span className={styles.eyebrow}>Ô ĐANG CHỌN</span>
     <h3>{selectedZone?.direction} · cung {activeZone}</h3>
     <label className={styles.zoneLabel}>Gán chức năng sử dụng
      <select value={plan[activeZone]} onChange={e=>setPlan(prev=>assignRoom(prev,activeZone,e.target.value))}>{ROOM_TYPES.map(room=><option key={room} value={room}>{room}</option>)}</select>
     </label>
     <div className={styles.detail}><span>Đối chiếu {reference==='house'?'Trạch quái':'Mệnh quái'}</span><strong>{zoneRelation?.label??(activeZone===5?'Trung cung — không thuộc tám phương':'Chưa đủ dữ liệu')}</strong><small>{zoneRelation?`Nhãn ${zoneRelation.kind} theo Bát Trạch truyền thống; không đánh giá an toàn hay hiệu quả thực tế.`:'Hãy nhập đủ hướng tọa hoặc năm sinh, rồi chọn hệ quy chiếu phía trên.'}</small></div>
     <button type="button" className={styles.resetButton} onClick={()=>setPlan(blankFloorPlan())}>Xóa toàn bộ phân khu đã gán</button>
     <p className={styles.hint}>Các khu vực được gán thủ công trong phiên làm việc này, không được hệ thống suy ra từ bản vẽ hoặc cảm biến. Không sử dụng làm cơ sở kết luận thiết kế, kết cấu hay an toàn công trình.</p>
    </div>
   </div>
  </section>
  <section className={styles.section} aria-labelledby="feng-dai-quai">
   <header className={styles.heading}><span className={styles.eyebrow}>07 / 玄空大卦 · HUYỀN KHÔNG ĐẠI QUÁI</span><h2 id="feng-dai-quai">64 quẻ la kinh · 384 phân đoạn hào</h2><p>Từ góc hướng mặt quay ra, định vị quẻ Huyền Không Đại Quái trên vòng 64 × 5,625°. Tọa ngược hướng 180°. Quái khí và Quái vận lấy theo bảng quẻ độc lập, <strong>không dùng sao Phi Tinh để thay thế</strong>.</p></header>
   <div className={styles.formRowWide}>
    <label>Sai số đo dự kiến (± độ)<input type="number" min="0" max="7.5" step="0.1" value={accuracyText} onChange={e=>setAccuracyText(e.target.value)} aria-invalid={!validAccuracy}/></label>
    <div className={styles.controlPanel}><small className={styles.eyebrow}>TÌNH TRẠNG SỐ ĐO</small><p className={styles.hint}>{audit?.status==='measured-stable'?'Số đo không chạm biên 24 sơn hoặc 64 quẻ trong phạm vi sai số đã nhập.':audit?'Số đo chưa đủ ổn định để chốt cả hai hệ tọa–hướng.':'Cần số đo la bàn và sai số hợp lệ (0–7,5°).'}</p></div>
   </div>
   {guaPair?<div className={styles.twoColumns}>
    <div className={styles.controlPanel}>
     <span className={styles.eyebrow}>HƯỚNG · MẶT QUAY RA</span>
     <div className={styles.guaHero}><span>{guaPair.facing.symbol}</span><strong>{guaPair.facing.han}</strong><small>Quẻ số {guaPair.facing.kingWen} · vòng #{guaPair.facing.ordinal}</small></div>
     <div className={styles.detail}><span>Vòng cung la kinh</span><strong>{guaPair.facing.from.toFixed(3)}°–{guaPair.facing.to.toFixed(3)}°</strong><small>Góc đo: {guaPair.facing.degrees.toFixed(3)}°</small></div>
     <div className={styles.detail}><span>Quái khí · Ngũ hành Hà Đồ</span><strong>{guaPair.facing.qi} · {ELEMENT_BY_QI[guaPair.facing.qi]}</strong></div>
     <div className={styles.detail}><span>Quái vận (khác vận nhà)</span><strong>{guaPair.facing.guaPeriod}</strong></div>
     <div className={styles.detail}><span>Phân đoạn hào theo góc</span><strong>{guaPair.facing.slotLine}/6</strong><small>Ranh giới: {guaPair.facing.slotLineFrom.toFixed(4)}°–{guaPair.facing.slotLineTo.toFixed(4)}°; không mặc định đây là hào số theo phép trừu hào.</small></div>
    </div>
    <div className={styles.controlPanel}>
     <span className={styles.eyebrow}>TỌA · MẶT LƯNG</span>
     <div className={styles.guaHero}><span>{guaPair.sitting.symbol}</span><strong>{guaPair.sitting.han}</strong><small>Quẻ số {guaPair.sitting.kingWen} · vòng #{guaPair.sitting.ordinal}</small></div>
     <div className={styles.detail}><span>Vòng cung la kinh</span><strong>{guaPair.sitting.from.toFixed(3)}°–{guaPair.sitting.to.toFixed(3)}°</strong><small>Góc đối: {guaPair.sitting.degrees.toFixed(3)}°</small></div>
     <div className={styles.detail}><span>Quái khí · Ngũ hành Hà Đồ</span><strong>{guaPair.sitting.qi} · {ELEMENT_BY_QI[guaPair.sitting.qi]}</strong></div>
     <div className={styles.detail}><span>Quái vận đối chiếu</span><strong>{guaPair.sitting.guaPeriod}</strong></div>
     <div className={styles.detail}><span>Kiểm tra cặp quẻ</span><strong>{guaPair.pairingVerified?'Đủ căn cứ về phương vị':'Chưa đủ căn cứ về phương vị'}</strong><small>Quẻ đối âm dương: {guaPair.inverseLines?'khớp':'không khớp'} · Quái khí tổng 10: {guaPair.complementaryQi?'khớp':'không khớp'} · Cùng Quái vận: {guaPair.sameGuaPeriod?'khớp':'không khớp'}</small></div>
    </div>
   </div>:<p className={styles.warning} role="status">Chưa lập được cặp quẻ: cần số đo hướng và sai số hợp lệ.</p>}
   {guaPair&&!guaPair.stable&&<p className={styles.warning} role="status">Dữ liệu cặp quẻ trên là mẫu tại góc nhập, <strong>không phải cặp quẻ đã xác nhận</strong>. Sai số có thể chuyển sang quẻ bên cạnh; hãy đo lại.</p>}
   {audit?.issues.map((issue,index)=><p key={index} className={styles.warning}>{issue}</p>)}
   <div className={styles.atlasControls}><button type="button" className={styles.resetButton} aria-expanded={showAtlas} aria-controls="great-hexagram-atlas" onClick={()=>setShowAtlas(v=>!v)}>{showAtlas?'Ẩn bảng 64 quẻ':'Tra cứu đủ 64 quẻ / Quái khí / Quái vận'}</button><span>64 quẻ × 6 đoạn = 384 phân đoạn · Mỗi quẻ 5,625° · Mỗi đoạn 0,9375°</span></div>
   {showAtlas&&<div id="great-hexagram-atlas" className={styles.atlasScroll} role="region" aria-label="Bảng 64 quẻ Huyền Không Đại Quái" tabIndex={0}><table className={styles.atlasTable}><thead><tr><th>STT</th><th>Quẻ</th><th>Độ</th><th>Quái khí</th><th>Quái vận</th></tr></thead><tbody>{ATLAS.map(item=><tr key={item.index} data-active={item.index===guaPair?.facing.index?'true':undefined}><td>{item.ordinal}</td><td>{item.symbol} {item.han} · #{item.kingWen}</td><td>{item.from.toFixed(3)}–{item.to.toFixed(3)}</td><td>{item.qi} · {ELEMENT_BY_QI[item.qi]}</td><td>{item.guaPeriod}</td></tr>)}</tbody></table></div>}
   <details className={styles.caveat}><summary>Quy tắc, nguồn đối chiếu và phạm vi tính</summary><p>Dữ liệu atlas: Wikibooks — Feng Shui / Xuan Kong Da Gua / Binary Representation of the 64 Hexagrams (CC BY-SA, ghi nhận bảng chỉnh sửa 16/08/2026). 64 quẻ được chia từ Bắc 0° thuận kim đồng hồ, mỗi đoạn rộng 5,625°. Sáu khoảng 0,9375° là phân đoạn hình học, chưa gán ý nghĩa biến hào, không thực hiện trừu hào hoán tượng, phân kim theo phái hoặc chọn ngày Đại Quái. Số Quái khí/Quái vận thuộc atlas, không được suy ra từ Phi Tinh.</p></details>
  </section>
  <section className={styles.section} aria-labelledby="feng-evidence">
   <header className={styles.heading}><span className={styles.eyebrow}>08 / KIỂM TRA ĐIỀU KIỆN · TRUY VẾT</span><h2 id="feng-evidence">Đối chiếu ba trường phái mà không trộn phép tính</h2><p>Cùng một tọa–hướng có thể dùng làm đầu vào cho ba hệ, nhưng mỗi phép đưa ra kết quả độc lập. Chỉ trình bày cấu trúc và độ tin cậy của đầu vào.</p></header>
   <div className={styles.evidenceGrid}>
    <div><small>Huyền Không Phi Tinh · Hạ quái</small><strong>{audit?audit.structure.label:'Chưa có dữ liệu'}</strong><span>{audit?.stableMountain?'24 sơn trong sai số ổn định':'Cần xác minh sơn hướng'}</span></div>
    <div><small>Huyền Không Đại Quái</small><strong>{guaPair?`${guaPair.sitting.han} ⇄ ${guaPair.facing.han}`:'Chưa có dữ liệu'}</strong><span>{guaPair?.stable?`Cùng Quái vận ${guaPair.facing.guaPeriod}`:'Chưa xác nhận quẻ theo sai số'}</span></div>
    <div><small>Bát Trạch · Mệnh quái/Trạch quái</small><strong>{life&&house?`${life.name} / ${house.name}`:'Chưa đủ hai quái'}</strong><span>{comparison?(comparison.sameGroup?'Cùng nhóm Đông/Tây tứ':'Khác nhóm Đông/Tây tứ'):'Cần nhập năm tiết khí và tọa'}</span></div>
   </div>
   {batTrachComparison&&<p className={styles.hint}>Đối chiếu riêng hướng <strong>{batTrachComparison.direction}</strong> (đang chọn trên bàn Phi Tinh): theo Trạch quái là <strong>{batTrachComparison.house.label}</strong>, theo Mệnh quái là <strong>{batTrachComparison.person.label}</strong>. Hai kết quả không được lấy trung bình.</p>}
   <p className={styles.hint}>Giới hạn: vận nhà là giá trị nhập tay; cần kiểm chứng mốc xây dựng/cải tạo và Lập Xuân. Số đo có thể chịu nhiễu từ, địa hình, la kinh. Không dùng các bảng này thay khảo sát thiết kế, kết cấu, kỹ thuật công trình.</p>
  </section>
 </div>;
}
