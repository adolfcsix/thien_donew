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
module.exports=Object.freeze({
 SOURCE_COMMIT,SOURCE_URL,SOURCE_NAMES,NORMALIZED_NAMES,SOURCE_ALIASES,
 SOURCE_VARIANTS,SOURCE_VOID_NOTICE,CATALOG_AUDIT,reconcileClassicalVoidVocabulary
});
