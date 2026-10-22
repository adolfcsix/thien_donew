/* THIÊN ĐỒ reference layer, NOT an astronomical calculation or predictive verdict.
 * One documented, versioned Vietnamese 14x12 convention; other schools differ.
 * Source (retrieved 2026-10-10): https://somenh.vn/mieu-vuong-dac-ham
 * Source explicitly notes alternate treatment for Thiên Lương at Sửu/Mùi.
 * Never mutate natal placements when adding/replacing reference profiles.
 */
(function(root){
 'use strict';
 const RULESET = 'somenh-14-main-stars-2026-09-18-v1';
 const SOURCE = 'https://somenh.vn/mieu-vuong-dac-ham';
 const BRANCHES = Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
 const LABELS = Object.freeze({M:'Miếu',V:'Vượng',D:'Đắc',B:'Bình',H:'Hãm'});
 const TABLE = Object.freeze({
  'Tử Vi': 'DDMBVMMDMBVD',
  'Thiên Cơ': 'DDHMMVDVVMMH',
  'Thái Dương': 'HDVVVMMDHHHH',
  'Vũ Khúc': 'VMVDMHVMVDMH',
  'Thiên Đồng': 'VHMDHDHHMHHD',
  'Liêm Trinh': 'VDVHMHVDVHMH',
  'Thiên Phủ': 'MBMBVDMDMBVD',
  'Thái Âm': 'VDHHHHHDVMMM',
  'Tham Lang': 'HMDHVHHMDHVH',
  'Cự Môn': 'VHVMHHVHDMHD',
  'Thiên Tướng': 'VDMHVDVDMHVD',
  'Thiên Lương': 'VDVVMHMDVHMH',
  'Thất Sát': 'MDMHHVMDMHHV',
  'Phá Quân': 'MVHHDHMVHHDH'
 });
 const NAMES = Object.freeze(Object.keys(TABLE));
 function lookup(name,branchIndex){
   if(typeof name !== 'string' || !Object.prototype.hasOwnProperty.call(TABLE,name) || !Number.isInteger(branchIndex) || branchIndex<0 || branchIndex>11) return null;
   const status = TABLE[name][branchIndex];
   return Object.freeze({name,branch:branchIndex,branchName:BRANCHES[branchIndex],status,label:LABELS[status],ruleSet:RULESET,source:SOURCE});
 }
 function matrix(){return NAMES.map(name=>Object.freeze({name,levels:Object.freeze([...TABLE[name]])}));}
 const api=Object.freeze({RULESET,SOURCE,BRANCHES,LABELS,NAMES,lookup,matrix});
 if(typeof module!=='undefined' && module.exports) module.exports=api;
 root.ThienDoStarStrength=api;
})(typeof globalThis!=='undefined'?globalThis:this);
