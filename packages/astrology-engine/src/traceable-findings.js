/* THIÊN ĐỒ — evidence-backed *observations*, not automated fortune-telling.
 * Rule identifiers and source paths are stable for audit and regression tests.
 * No star placement is performed here. Supports old charts through palace-research.js.
 */
(function(root) {
  'use strict';
  const RULESET = 'palace-traceable-findings-v1.0';
  const ROLES = ['selected','tam-hop','tam-hop','opposite'];
  const NATAL_STAR_LAYERS = ['main','auxiliary','year','additional','traditional','natal-extensions','benefic','positional','derived','missing-stars'];
  const SOURCE_LAYERS = [...NATAL_STAR_LAYERS,'birth-transformation','annual-transformation','annual-star'];
  const SOURCE_PATHS = Object.freeze({
    main:'houses[].stars',auxiliary:'houses[].auxiliaryStars',year:'houses[].yearStars',additional:'houses[].additionalStars',traditional:'houses[].traditionalStars','natal-extensions':'houses[].natalExtensionStars',benefic:'houses[].beneficStars',positional:'houses[].positionalStars',derived:'houses[].derivedStars','missing-stars':'houses[].missingStars',
    'birth-transformation':'houses[].tuHoa','annual-transformation':'annual.luuTuHoa.items','annual-star':'annual.luuStars.items',
  });
  const source = (p, record) => ({
    role:p.role, branchIndex:p.branchIndex, palace:p.palace, branch:p.branch,
    layer:record.kind, star:record.name, path:record.path,
    ...(record.transformation ? {transformation:record.transformation} : {}),
  });
  const records = (p,id) => p.layers.find(layer => layer.id === id)?.records ?? [];
  function validate(research) {
    if(!research || !Array.isArray(research.perspectives) || research.perspectives.length!==4)
      throw new RangeError('Cần đúng bốn cung từ dữ liệu Palace Research');
    const seen = new Set();
    for(let i=0;i<4;i++){
      const p=research.perspectives[i];
      if(!p || p.role!==ROLES[i] || !Number.isInteger(p.branchIndex) || p.branchIndex<0 || p.branchIndex>11 || seen.has(p.branchIndex) ||
         typeof p.palace!=='string' || typeof p.branch!=='string' || !Array.isArray(p.layers))
        throw new RangeError('Bốn cung nghiên cứu có dữ liệu không hợp lệ');
      seen.add(p.branchIndex);
      const seenLayers=new Set();
      for(const layer of p.layers){
        if(!layer || !SOURCE_LAYERS.includes(layer.id) || seenLayers.has(layer.id) || layer.path!==SOURCE_PATHS[layer.id] || !Array.isArray(layer.records))
          throw new RangeError('Lớp bằng chứng không hợp lệ');
        seenLayers.add(layer.id);
        for(const record of layer.records){
          if(!record || record.kind!==layer.id || record.branchIndex!==p.branchIndex || record.path!==layer.path || typeof record.name!=='string')
            throw new RangeError('Nguồn sao không khớp lớp hoặc cung');
        }
      }
      if(SOURCE_LAYERS.some(id=>id!=='natal-extensions' && id!=='positional' && id!=='derived' && !seenLayers.has(id)))throw new RangeError('Thiếu lớp bằng chứng bắt buộc');
    }
    const base=research.perspectives[0].branchIndex;
    if(research.branchIndex!==base || research.perspectives[1].branchIndex!==(base+4)%12 ||
       research.perspectives[2].branchIndex!==(base+8)%12 || research.perspectives[3].branchIndex!==(base+6)%12)
      throw new RangeError('Quan hệ Tam hợp / Đối cung không khớp');
  }
  function build(research,{includeAnnual=true}={}) {
    validate(research);
    const [selected,firstTam,secondTam,opposite]=research.perspectives;
    const findings=[];
    const push=(id,title,description,category,evidence,annual=false) => {
      if(!evidence.length) return;
      findings.push({id,title,description,category,annual,evidence});
    };
    const main=records(selected,'main');
    if(main.length){
      push('TD-01','Chính tinh tại cung đang xét',
        `Cung ${selected.palace} (${selected.branch}) có ${main.map(x=>x.name).join(', ')}. Đây chỉ là vị trí an sao, chưa phải luận đoán.`,
        'dong-cung',main.map(x=>source(selected,x)));
      if(main.length>=2)push('TD-02','Nhiều chính tinh đồng cung',
        `${main.length} chính tinh cùng nằm ở ${selected.branch}; cần đối chiếu theo cung chức và các lớp khác.`,
        'dong-cung',main.map(x=>source(selected,x)));
    }else{
      // A positional finding still needs evidence. The empty main-layer path is the source.
      const layer=selected.layers.find(x=>x.id==='main');
      findings.push({id:'TD-03',title:'Vô chính diệu theo lớp dữ liệu hiện tại',
        description:`Chưa có chính tinh trong cung ${selected.palace} (${selected.branch}) theo bộ an sao đã nạp. Không đồng nghĩa cung này xấu.`,
        category:'dong-cung',annual:false,evidence:[{role:selected.role,branchIndex:selected.branchIndex,palace:selected.palace,branch:selected.branch,layer:'main',star:null,path:layer?.path??'houses[].stars'}]});
    }
    const tamSources=[firstTam,secondTam].flatMap(p=>records(p,'main').map(record=>source(p,record)));
    push('TD-04','Chính tinh tại hai cung Tam hợp',
      `Hai cung Tam hợp có ${tamSources.length} lượt chính tinh trong lớp đã tính. Số lượt không phải thang điểm tốt/xấu.`,
      'tam-phuong',tamSources);
    const oppSources=records(opposite,'main').map(record=>source(opposite,record));
    push('TD-05','Chính tinh tại Đối cung',
      `Cung ${opposite.palace} (${opposite.branch}) có ${oppSources.map(x=>x.star).join(', ')}; dùng để đối chiếu vị trí, không khẳng định ảnh hưởng.`,
      'tam-phuong',oppSources);
    for(const p of research.perspectives){
      const natal=records(p,'birth-transformation');
      for(const record of natal){
        push('TD-06','Tứ Hóa năm sinh',
          `${record.transformation} gắn với ${record.name} tại cung ${p.palace} (${p.branch}) theo bảng an năm sinh.`,
          'tu-hoa',[source(p,record)]);
      }
      if(includeAnnual && research.annualYear!==null){
        for(const record of records(p,'annual-transformation')){
          push('TD-07','Tứ Hóa năm xem',
            `${record.transformation} gắn với ${record.name} tại cung ${p.palace} (${p.branch}) trong năm xem ${research.annualYear}; tách biệt Tứ Hóa năm sinh.`,
            'luu-nien',[source(p,record)],true);
        }
        const byStar=new Map();
        for(const record of natal){
          const key=record.name;
          if(!byStar.has(key))byStar.set(key,[]);
          byStar.get(key).push(record);
        }
        for(const record of records(p,'annual-transformation')){
          for(const birth of byStar.get(record.name)??[]){
            push('TD-08','Cùng sao nhận Hóa ở hai lớp năm',
              `${record.name} tại ${p.palace} có Hóa năm sinh (${birth.transformation}) và Hóa năm xem ${research.annualYear} (${record.transformation}). Đây là hai lớp dữ liệu khác nhau.`,
              'doi-chieu',[source(p,birth),source(p,record)],true);
          }
        }
      }
      const natalNames=new Set(NATAL_STAR_LAYERS.flatMap(id=>records(p,id).map(r=>r.name)));
      for(const id of ['birth-transformation',...(includeAnnual && research.annualYear!==null ? ['annual-transformation'] : [])]){
        for(const record of records(p,id)){
          if(natalNames.has(record.name))continue;
          push('TD-09','Chưa tìm thấy sao gốc để đối chiếu Hóa',
            `${record.name} có dữ liệu ${record.transformation} tại ${p.palace}, nhưng không có trong các lớp sao gốc của cung này; cần kiểm tra phạm vi an sao trước khi diễn giải.`,
            'kiem-tra',[source(p,record)],id==='annual-transformation');
        }
      }
    }
    return {
      ruleSet:RULESET,sourceRuleSet:research.ruleSet,annualYear:includeAnnual ? research.annualYear : null,
      anchorBranchIndex:selected.branchIndex,anchorPalace:selected.palace,
      findings,
      summary:{all:findings.length,natal:findings.filter(x=>!x.annual).length,annual:findings.filter(x=>x.annual).length},
      disclaimer:'Các thẻ là quan sát có điều kiện và đường dẫn nguồn để kiểm chứng. Không phải điểm số, lời tiên đoán, kết luận cát/hung hay tư vấn quyết định cá nhân.',
    };
  }
  const api=Object.freeze({RULESET,build});
  if(typeof module!=='undefined' && module.exports)module.exports=api;
  root.ThienDoTraceableFindings=api;
})(typeof globalThis!=='undefined'?globalThis:this);
