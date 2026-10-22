'use strict';
/**
 * V11.30. Generate a READ-ONLY catalogue from the actual engine inventory.
 * Do not maintain a second handwritten list of placed stars. This generator is
 * the source of the checked-in snapshot consumed by knowledge/UI modules.
 * It records software evidence, not scholarly validation of any star rule.
 */
const fs = require('node:fs');
const path = require('node:path');
const {buildInventory} = require('../../packages/star-audit/src/index.cjs');
const Knowledge = require('../../packages/knowledge/src/index.cjs');
const root = path.resolve(__dirname, '../..');
const registryPath = 'packages/knowledge/src/star-identity-registry.json';
const normal = input => String(input).normalize('NFC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase('vi-VN');
const slug = value => normal(value).replace(/đ/gu,'d').normalize('NFD').replace(/[\u0300-\u036f]/gu, '').replace(/[^a-z0-9]+/gu,'-').replace(/^-|-$/gu,'');
const groupCatalogues = {
  traditional: 'packages/knowledge/src/traditional-star-catalogue.json',
  natal_extensions: 'packages/knowledge/src/natal-extension-catalogue.json',
};
const mainStudy = 'packages/knowledge/src/star-study-guide.json';
const mainGuidance = 'packages/knowledge/src/primary-star-palace-guidance.json';
const symbolNotes = 'packages/knowledge/src/star-symbols.json';
const markerNotes = 'packages/knowledge/src/obstruction-symbols.json';

function buildStarRegistry() {
  const inventory = buildInventory();
  const records = [];
  const errors = [];
  const byKey = new Map();
  const byCanonicalName = new Map();
  function add(data) {
    const key = `${data.layer}:${data.group}:${slug(data.name)}`;
    if (!slug(data.name) || byKey.has(key)) throw new Error(`Collision or empty star id: ${key}`);
    const record = {
      id: key,
      name: data.name,
      layer: data.layer,
      type: data.type,
      group: data.group,
      placementModule: data.placementModule,
      editorialSources: data.editorialSources || [],
      originId: data.originId || null,
      expertReviewed: false,
      reviewStatus: 'not-independently-reviewed',
    };
    if (!record.placementModule || !fs.existsSync(path.join(root,record.placementModule))) errors.push(`Missing placement module for ${key}: ${record.placementModule}`);
    for (const evidence of record.editorialSources) if (!fs.existsSync(path.join(root,evidence))) errors.push(`Missing editorial source for ${key}: ${evidence}`);
    records.push(record);
    byKey.set(key,record);
    const canonicalKey=`${record.layer}:${normal(record.name)}`;
    if(byCanonicalName.has(canonicalKey)) throw new Error(`Ambiguous canonical spelling: ${canonicalKey}`);
    byCanonicalName.set(canonicalKey,record);
    return record;
  }
  const natalSet = new Set(inventory.records.map(s => normal(s.name)));
  for(const entry of inventory.records) {
    const main = entry.group==='main';
    const isCycle=entry.layer==='cycle';
    const editorialSources = main ? [mainStudy,mainGuidance] : [symbolNotes];
    if(groupCatalogues[entry.group]) editorialSources.push(groupCatalogues[entry.group]);
    add({name:entry.name,layer:isCycle?'cycle':'natal',type:'star',group:entry.group,
      placementModule:`packages/astrology-engine/src/${entry.placementModule}`,
      editorialSources});
  }
  const lookupBase = name => {
    // Derived relation ONLY when the exact canonical natal name is present.
    const base = name.startsWith('Lưu ') ? name.slice(4) : '';
    if(!base || !natalSet.has(normal(base))) return null;
    const found=records.find(r=>r.name===base && (r.layer==='natal'||r.layer==='cycle'));
    return found ? found.id : null;
  };
  for(const entry of inventory.annualRecords){
    add({name:entry.name,layer:'annual',type:'annual-star',group:'annual-overlays',
      placementModule:'packages/astrology-engine/src/annual-layers.js',
      originId:lookupBase(entry.name)});
  }
  for(const marker of inventory.markers) {
    add({name:marker.name,layer:'obstruction',type:'paired-marker',group:'obstruction-markers',
      placementModule:'packages/astrology-engine/src/advanced-placements.js',editorialSources:[markerNotes]});
  }
  for(const [layer,names] of [['natal-transformation',inventory.transforms.natal],['annual-transformation',inventory.transforms.annual]]) {
    for(const name of names) add({name,layer,type:'transformation-label',group:'tu-hoa',
      placementModule:layer==='natal-transformation'?'packages/astrology-engine/src/tuhoa.js':'packages/astrology-engine/src/annual-layers.js'});
  }
  if(inventory.totals.annualThaiTueLocator) {
    add({name:'Lưu Thái Tuế',layer:'annual-locator',type:'branch-locator',group:'annual-locator',
      placementModule:'packages/astrology-engine/src/annual.js',originId:byCanonicalName.get('cycle:thái tuế')?.id});
  }
  // Do not infer alias spellings: every distinct spelling requires a reviewed decision.
  // Index the exact NFC names. Duplicate across layers is intentionally retained.
  // Validate metadata links between editorial rule inputs and canonical natal/transform identities.
  const ruleCollections = [
    ['combination','packages/knowledge/src/combination-rules.json',Knowledge.combinationRules],
    ['relationship','packages/knowledge/src/relationship-patterns.json',Knowledge.relationshipPatterns],
    ['classical','packages/knowledge/src/classical-families.json',Knowledge.classicalFamilies],
    ['adjacent','packages/knowledge/src/adjacent-palace-patterns.json',Knowledge.adjacentPalacePatterns],
    ['geometry','packages/knowledge/src/natal-geometry-rules.json',Knowledge.natalGeometryRules]
  ];
  const rules=[];
  for(const [kind,source,items] of ruleCollections) {
    for(const r of items) {
      const conditions=r.conditions || {};
      const names = (kind==='adjacent' || kind==='geometry') ? [...r.stars,...(r.anchor?[r.anchor]:[])] : (conditions.scope==='natal-transformation' ? [conditions.name] :
        ['all','requiredStars','focusAny','supportAny','reviewAny'].flatMap(key=>Array.isArray(conditions[key])?conditions[key]:[]));
      const ids=[];
      for(const name of [...new Set(names)]){
        const layer = conditions.scope==='natal-transformation' ? 'natal-transformation' : 'natal';
        const found=byCanonicalName.get(`${layer}:${normal(name)}`);
        if(!found) errors.push(`Unresolved ${kind} rule ${r.id}: ${name} [${layer}]`);
        else ids.push(found.id);
      }
      rules.push({id:r.id,kind,source,starIds:ids});
    }
  }
  const counts = {};
  for(const record of records) counts[record.layer]=(counts[record.layer]||0)+1;
  if(errors.length) throw new Error('Star registry evidence errors:\n'+errors.join('\n'));
  return {
    schemaVersion:'1.0.0',generatedFrom:'engine-derived-star-inventory',release:JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version,
    warning:'Danh mục nội bộ về độ phủ code; không chứng minh công thức an sao hay luận đoán chính xác theo trường phái.',
    counts,
    records,
    ruleLinks: rules,
    unresolvedRuleReferences: errors,
    declaredAliases:[],
  };
}
function writeStarRegistry(){
  const data=buildStarRegistry();
  fs.writeFileSync(path.join(root,registryPath),JSON.stringify(data,null,2)+'\n');
  return data;
}
if(require.main===module){
  const data=process.argv.includes('--write')?writeStarRegistry():buildStarRegistry();
  console.log(`Star registry: ${data.records.length} typed identities, ${data.ruleLinks.length} rule links, ${data.unresolvedRuleReferences.length} dangling references`);
}
module.exports={buildStarRegistry,writeStarRegistry,registryPath,normal,slug};
