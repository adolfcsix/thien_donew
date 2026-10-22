import type {LedgerLayer, LedgerRecord, LedgerRow} from './twelve-palace-ledger';

/**
 * Read-only interpretation worksheet. Provenance is retained at the original
 * houses[]/annual[] index, while editorial study material is explicitly separated.
 * This module performs no astrology calculations or predictions.
 */
export type StarStudy = {motif:string;study:string;caution:string;crossCheck:string};
export type PalaceStudy = {scope:string;question:string;crossCheck:string;caution:string};
export type StudyGuide = {
  edition:string;disclaimer:string;sources:readonly string[];
  stars:Readonly<Record<string,StarStudy>>;
  palaces:Readonly<Record<string,PalaceStudy>>;
};
export type StudyRole = 'focus'|'tam-hop-1'|'tam-hop-2'|'opposite';
export type StudyPerspective = {
  role:StudyRole;caption:string;branchIndex:number;palace:string;branch:string;
  stars:readonly LedgerRecord[];transformations:readonly LedgerRecord[];
  sourcePaths:readonly string[];markers:readonly string[];
};
export type StudyCard = {
  role:StudyRole;branchIndex:number;palace:string;branch:string;
  star:string;motif:string;study:string;caution:string;crossCheck:string;
  evidencePath:string;editorialPath:string;
};
export type StudyWorksheet = {
  focus:StudyPerspective;perspectives:readonly StudyPerspective[];
  cards:readonly StudyCard[];uncovered:readonly {star:string;sourcePath:string}[];
  topic:PalaceStudy|null;topicPath:string|null;
  guideEdition:string;guideSources:readonly string[];
};
export type StudyMode = 'focus'|'relations';

export function studyRelationBranches(branchIndex:number): readonly {role:StudyRole;caption:string;branchIndex:number}[] {
  if(!Number.isInteger(branchIndex)||branchIndex<0||branchIndex>11)throw new RangeError('Địa chi cần trong khoảng 0–11.');
  return [
    {role:'focus',caption:'Cung đang xét',branchIndex},
    {role:'tam-hop-1',caption:'Tam hợp · +4 chi',branchIndex:(branchIndex+4)%12},
    {role:'tam-hop-2',caption:'Tam hợp · +8 chi',branchIndex:(branchIndex+8)%12},
    {role:'opposite',caption:'Đối cung · +6 chi',branchIndex:(branchIndex+6)%12},
  ];
}

const isMain = (record:LedgerRecord) => record.layer==='main';
const isHoa = (record:LedgerRecord) => record.layer==='birth-transformation'||record.layer==='annual-transformation';
const natalOnly = (record:LedgerRecord,showAnnual:boolean) => showAnnual || !record.layer.startsWith('annual-');

/** Consume validated ledger rows; never synthesize missing stars or positions. */
export function buildPalaceStudyWorksheet(
  rows: readonly LedgerRow[],selectedBranch:number,guide:StudyGuide,showAnnual:boolean,
  mode:StudyMode = 'relations',
): StudyWorksheet {
  if(rows.length!==12||new Set(rows.map(row=>row.branchIndex)).size!==12)throw new RangeError('Cần đủ 12 cung hợp lệ.');
  const rowsByBranch=new Map(rows.map(row=>[row.branchIndex,row]));
  if(rows.some(row=>!Number.isInteger(row.branchIndex)||row.branchIndex<0||row.branchIndex>11))throw new RangeError('Chỉ số địa chi không hợp lệ.');
  const relations=studyRelationBranches(selectedBranch);
  const perspectives:StudyPerspective[]=relations.map(relation=>{
    const row=rowsByBranch.get(relation.branchIndex);
    if(!row)throw new RangeError('Thiếu dữ liệu cung liên hệ.');
    const records=row.records.filter(record=>natalOnly(record,showAnnual));
    return {
      ...relation,palace:row.palace,branch:row.branch,
      stars:records.filter(isMain),transformations:records.filter(isHoa),
      sourcePaths:records.map(record=>record.sourcePath),
      markers:showAnnual?row.markers:[],
    };
  });
  const selected=perspectives[0];
  const included=mode==='focus'?perspectives.slice(0,1):perspectives;
  const cards:StudyCard[]=[];
  const uncovered:{star:string;sourcePath:string}[]=[];
  for(const perspective of included){
    for(const record of perspective.stars){
      // Prototype-safe own-property lookup: unknown stars stay unknown, not inferred.
      const entry=Object.prototype.hasOwnProperty.call(guide.stars,record.star)?guide.stars[record.star]:undefined;
      if(!entry){uncovered.push({star:record.star,sourcePath:record.sourcePath});continue;}
      cards.push({
        role:perspective.role,branchIndex:perspective.branchIndex,palace:perspective.palace,
        branch:perspective.branch,star:record.star,motif:entry.motif,study:entry.study,
        caution:entry.caution,crossCheck:entry.crossCheck,evidencePath:record.sourcePath,
        editorialPath:`star-study-guide.json → stars[${JSON.stringify(record.star)}]`,
      });
    }
  }
  const topic=Object.prototype.hasOwnProperty.call(guide.palaces,selected.palace)?guide.palaces[selected.palace]:null;
  return {focus:selected,perspectives,cards,uncovered,topic,
    topicPath:topic?`star-study-guide.json → palaces[${JSON.stringify(selected.palace)}]`:null,
    guideEdition:guide.edition,guideSources:guide.sources};
}

export function worksheetEvidence(worksheet:StudyWorksheet,mode:StudyMode,includeAnnual:boolean): readonly {
  role:StudyRole;palace:string;label:string;path:string;layer:LedgerLayer
}[] {
  const roles=new Set((mode==='focus'?worksheet.perspectives.slice(0,1):worksheet.perspectives).map(p=>p.role));
  // The worksheet does not hold all layers; explicit evidence comes from main-star and transformation records.
  return worksheet.perspectives.filter(p=>roles.has(p.role)).flatMap(p=>[
    ...p.stars.map(r=>({role:p.role,palace:p.palace,label:r.label,path:r.sourcePath,layer:r.layer})),
    ...p.transformations.filter(r=>includeAnnual||!r.layer.startsWith('annual-')).map(r=>({role:p.role,palace:p.palace,label:r.label,path:r.sourcePath,layer:r.layer})),
  ]);
}

/** Plain-text local download: excludes birth date, birth time, name and gender. */
export function exportStudyMarkdown(
  worksheet:StudyWorksheet, mode:StudyMode,note:string,includeAnnual:boolean,year:number,
  options:{includeTechnical?:boolean} = {},
):string {
  const clean=(value:string)=>value.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g,'').trim();
  const title=clean(worksheet.focus.palace);
  const evidence=worksheetEvidence(worksheet,mode,includeAnnual);
  const lines=[
    '# THIÊN ĐỒ · Sổ tay nghiên cứu cung '+title,
    '',`- Địa chi: ${clean(worksheet.focus.branch)}`,
    `- Phạm vi: ${mode==='focus'?'Một cung':'Tam phương Tứ chính'}`,
    `- Năm đối chiếu: ${includeAnnual?year:'Chỉ năm sinh'}`,
    ...(options.includeTechnical === false ? [] : [`- Bản biên soạn: ${clean(worksheet.guideEdition)}`]),'',
    '## Chủ đề cung',clean(worksheet.topic?.scope??'Chưa có dữ liệu chủ đề.'),'',
    '## Câu hỏi nghiên cứu',clean(worksheet.topic?.question??'Chưa có câu hỏi biên soạn.'),'',
    '## Đối chiếu cấu trúc',clean(worksheet.topic?.crossCheck??'Cần đối chiếu tài liệu.'),'',
    ...worksheet.cards.map(card=>options.includeTechnical===false
      ? `- **${clean(card.star)}** · ${clean(card.palace)} (${clean(card.branch)}): ${clean(card.motif)}.`
      : `- **${clean(card.star)}** · ${clean(card.palace)} (${clean(card.branch)}): ${clean(card.motif)}. Nguồn dữ liệu: \`${clean(card.evidencePath)}\`. Nguồn biên soạn: \`${clean(card.editorialPath)}\`.`),
    ...(options.includeTechnical===false ? ['', '## Các sao và cung liên quan',...evidence.map(item=>`- ${clean(item.palace)} · ${clean(item.label)}`)]
      : ['', '## Vết nguồn (dữ liệu engine)',...evidence.map(item=>`- ${clean(item.palace)} · ${clean(item.label)} — \`${clean(item.path)}\``)]),
    '', '## Ghi chú do người dùng tự viết',clean(note)||'_(Chưa có ghi chú)_',
    '', '## Giới hạn phương pháp',
    clean(worksheet.topic?.caution??'Không kết luận cát hung khi không có luận cứ.'),
    'Đây là tài liệu học biểu tượng truyền thống, không phải dự đoán khoa học hoặc tư vấn y tế, pháp lý, tài chính.',
    ...(options.includeTechnical===false ? [] : ['', '## Tư liệu tham khảo (không phải nguồn xác nhận engine)',
      ...worksheet.guideSources.filter(s=>/^https:\/\//.test(s)).map(s=>'- '+s)]), '',
  ];
  return lines.join('\n');
}
