'use strict';

/**
 * R20: source-pinned lexical dossier only — NOT void-star placement.
 * Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d
 * algorithm.ts: applySchoolJiekong renames two legacy names; applySchoolFuxun
 * places 副旬 from 旬空. school-config.ts offers multiple 截空 variants.
 *
 * This module intentionally has no chart input or Boolean prediction API.
 */
const SOURCE_COMMIT='7922285d947b36610e7e31c232d8f1e2a0d0871d';
const SOURCE_URL='https://github.com/Renhuai123/ziwei-doushu/blob/'+SOURCE_COMMIT+'/lib/ziwei/algorithm.ts';
const SOURCE_NAMES=Object.freeze(['旬空','副旬','截路','截空','空亡','副截']);
const NORMALIZED_NAMES=Object.freeze(['旬空','副旬','截空','副截']);
const SOURCE_ALIASES=Object.freeze([
 Object.freeze({legacy:'截路',normalized:'截空',basis:'applySchoolJiekong'}),
 Object.freeze({legacy:'空亡',normalized:'副截',basis:'applySchoolJiekong'})
]);
const SOURCE_VARIANTS=Object.freeze(['single','double','zhanyan']);
const SOURCE_VOID_NOTICE='Nguồn Không Vong nêu sáu nhãn 旬空, 副旬, 截路, 截空, 空亡, 副截; thuật toán nguồn đổi 截路 thành 截空 và 空亡 thành 副截, đồng thời đặt 副旬 theo 旬空. Các nhãn này không phải sáu vị trí sao độc lập bắt buộc đồng thời có mặt. Thiên Đồ chưa đối chiếu vị trí an sao và biến thể phái nguồn; Tuần/Triệt không tự tương đương Không Vong.';
const ALIAS_MAP=Object.freeze({
 '旬空':'旬空','副旬':'副旬','截路':'截空',
 '截空':'截空','空亡':'副截','副截':'副截'
});

/**
 * Only normalize the six exact source labels. Refuse to infer a chart hit,
 * school parity, or equivalence to Thiên Đồ's Vietnamese Tuần/Triệt markers.
 */
function reconcileClassicalVoidVocabulary(sourceLabels){
 if(!Array.isArray(sourceLabels)||sourceLabels.some(x=>typeof x!=='string'))
  throw new TypeError('Expected array of source void labels');
 const recognized=[],unknown=[],canonical=new Set();
 for(const label of sourceLabels){
  if(Object.prototype.hasOwnProperty.call(ALIAS_MAP,label)){
   const normalized=ALIAS_MAP[label];
   recognized.push(Object.freeze({sourceLabel:label,normalized}));
   canonical.add(normalized);
  }else unknown.push(label);
 }
 const report={
  sourceUrl:SOURCE_URL,sourceCommit:SOURCE_COMMIT,
  recognized:Object.freeze(recognized),
  unresolved:Object.freeze(unknown),
  normalizedNames:Object.freeze([...canonical]),
  sourcePlacementVerified:false,schoolVariantVerified:false,
  sourceCriterionVerified:false,lexicalOnly:true
 };
 return Object.freeze(report);
}
const CATALOG_AUDIT=reconcileClassicalVoidVocabulary(SOURCE_NAMES);

/*
 * R21 source-code matrix. These are the exact 1-based numeric values in
 * school-data.ts (SCHOOL_JIEKONG_VARIANTS.v1/v2/v3 and SCHOOL_XUNKONG).
 * The SOURCE_XUN_CODES array includes two trailing source cells beyond
 * the documented 1..10 year-stem domain: intentionally not interpreted.
 * Numeric codes MUST NOT be mapped to Thiên Đồ branchIndex or chart stars.
 */
const SOURCE_SCHOOL_DATA_URL='https://github.com/Renhuai123/ziwei-doushu/blob/'+SOURCE_COMMIT+'/lib/ziwei/school-data.ts';
const SOURCE_STEMS=Object.freeze(['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý']);
const SOURCE_JK_SINGLE=Object.freeze([0,9,7,5,3,1,10,8,6,4,2]);
const SOURCE_JK_DOUBLE=Object.freeze([
 Object.freeze([0,0]),Object.freeze([9,10]),Object.freeze([8,7]),
 Object.freeze([5,6]),Object.freeze([4,3]),Object.freeze([1,2]),
 Object.freeze([10,9]),Object.freeze([7,8]),Object.freeze([6,5]),
 Object.freeze([3,4]),Object.freeze([2,1])
]);
const SOURCE_JK_ZHANYAN=Object.freeze([0,9,7,5,3,11,10,8,6,4,12]);
const SOURCE_XUN_CODES=Object.freeze([0,3,1,11,9,7,5,3,1,11,9,7,5]);
const SOURCE_VOID_STEM_ROWS=Object.freeze(SOURCE_STEMS.map((stem,i)=>{
 const n=i+1;
 return Object.freeze({
  stem,ordinal:n,xunSourceCode:SOURCE_XUN_CODES[n],
  single:Object.freeze([SOURCE_JK_SINGLE[n]]),
  double:Object.freeze([...SOURCE_JK_DOUBLE[n]]),
  zhanyan:Object.freeze([SOURCE_JK_ZHANYAN[n]]),
  sourceCodeMappingVerified:false,sourceSchoolParityVerified:false
 });
}));
const SOURCE_STEM_MATRIX_NOTE=
 'Bảng mã 1–12 chép từ school-data.ts tại commit tham khảo đã ghim. Ba biến thể single/double/zhanyan và bảng Xun được ghi theo chỉ số thiên can 1–10, không phải chỉ số địa chi của Thiên Đồ. Bảng Xun còn hai giá trị ngoài mười thiên can được tài liệu ghi rõ; không suy diễn cách dùng. Riêng biến thể double: đối chiếu mã 1–12 với cặp chi được thuật toán nguồn mô tả; đây chỉ là kiểm tra hai phát biểu của cùng nguồn, không xác nhận iztro, đồng nhất trường phái hay an sao Thiên Đồ. Không dùng bảng mã để phán định Không Vong hoặc tự tăng số mục được ánh xạ điều kiện trong danh mục.';
function lookupVoidStemCodes(stem,variant){
 if(typeof stem!=='string'||!SOURCE_VARIANTS.includes(variant))return null;
 const row=SOURCE_VOID_STEM_ROWS.find(r=>r.stem===stem);
 if(!row)return null;
 return Object.freeze({
  stem:row.stem,variant,ordinal:row.ordinal,
  xunSourceCode:row.xunSourceCode,
  sourceCodes:row[variant],
  sourceUrl:SOURCE_SCHOOL_DATA_URL,
  sourcePlacementVerified:false,sourceSchoolParityVerified:false,
  sourceCriterionVerified:false,sourceCodeMappingVerified:false
 });
}


/**
 * R23: source-only concordance check for the DEFAULT *double* Jiekong pair.
 *
 * The pinned algorithm.ts documents the five stem-pair placements:
 * Jia/Ji = Shen/You, Yi/Geng = Wu/Wei, Bing/Xin = Chen/Si,
 * Ding/Ren = Yin/Mao, Wu/Gui = Zi/Chou.
 * The first and second names are swapped for a yin year stem.
 * These independently stated rules are compared against school-data.ts v2.
 *
 * This checks source-table consistency only. In particular it neither reads
 * a Thiên Đồ natal chart nor proves iztro placement, school parity, Xunkong,
 * or the correctness of a classical pattern.
 */
const SOURCE_BRANCH_NAMES=Object.freeze([
 'Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'
]);
const SOURCE_DOUBLE_JIEKONG_BASE_CODES=Object.freeze([
 Object.freeze([9,10]),Object.freeze([7,8]),Object.freeze([5,6]),
 Object.freeze([3,4]),Object.freeze([1,2])
]);
function auditSourceDoubleJiekongCodeConcordance(stem){
 if(typeof stem!=='string')return null;
 const row=SOURCE_VOID_STEM_ROWS.find(item=>item.stem===stem);
 if(!row)return null;
 const pair=SOURCE_DOUBLE_JIEKONG_BASE_CODES[(row.ordinal-1)%5];
 const expected=row.ordinal%2===0?[pair[1],pair[0]]:[pair[0],pair[1]];
 const same=expected.length===row.double.length&&expected.every((v,i)=>v===row.double[i]);
 return Object.freeze({
  stem,variant:'double',
  sourceCodes:row.double,
  formulaCodes:Object.freeze(expected),
  formulaBranches:Object.freeze(expected.map(v=>SOURCE_BRANCH_NAMES[v-1])),
  sourceFormulaConcordant:same,
  sourceAlgorithmUrl:SOURCE_URL,
  sourceDataUrl:SOURCE_SCHOOL_DATA_URL,
  sourcePlacementVerified:false,sourceSchoolParityVerified:false,
  sourceCriterionVerified:false,sourceCodeMappingVerified:false
 });
}

module.exports=Object.freeze({
 SOURCE_COMMIT,SOURCE_URL,SOURCE_NAMES,NORMALIZED_NAMES,SOURCE_ALIASES,
 SOURCE_VARIANTS,SOURCE_VOID_NOTICE,CATALOG_AUDIT,reconcileClassicalVoidVocabulary,
 SOURCE_SCHOOL_DATA_URL,SOURCE_STEMS,SOURCE_VOID_STEM_ROWS,SOURCE_STEM_MATRIX_NOTE,
 SOURCE_XUN_CODES,lookupVoidStemCodes,auditSourceDoubleJiekongCodeConcordance
});
