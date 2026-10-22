/*
 * THIÊN ĐỒ — research index for natal and annual palace evidence.
 * Positional correspondence only: absolutely no auspicious/inauspicious inference.
 * Independent of star-placement algorithms and of the persisted chart schema.
 */
(function (root) {
  'use strict';
  const RULESET = 'palace-evidence-v1.0';
  const RING_SIZE = 12;
  const mod = index => ((index % RING_SIZE) + RING_SIZE) % RING_SIZE;
  const validBranch = index => Number.isInteger(index) && index >= 0 && index < RING_SIZE;
  const kinds = Object.freeze([
    Object.freeze({id: 'main', label: 'Chính tinh', path: 'houses[].stars'}),
    Object.freeze({id: 'auxiliary', label: 'Phụ tinh', path: 'houses[].auxiliaryStars'}),
    Object.freeze({id: 'year', label: 'Sao theo chi năm sinh', path: 'houses[].yearStars'}),
    Object.freeze({id: 'additional', label: 'Sao an bổ sung', path: 'houses[].additionalStars'}),
    Object.freeze({id: 'traditional', label: 'Sao truyền thống', path: 'houses[].traditionalStars'}),
    Object.freeze({id: 'benefic', label: 'Sao Đức · Giải', path: 'houses[].beneficStars'}),
    Object.freeze({id: 'positional', label: 'Sao theo cung và địa chi', path: 'houses[].positionalStars'}),
    Object.freeze({id: 'missing-stars', label: 'Sao an theo Can · Chi · Tháng · Giờ', path: 'houses[].missingStars'}),
    Object.freeze({id: 'derived', label: 'Sao Mệnh · Thân · Lộc Tồn', path: 'houses[].derivedStars'}),
    Object.freeze({id: 'natal-extensions', label: 'Sao mở rộng', path: 'houses[].natalExtensionStars'}),
    Object.freeze({id: 'birth-transformation', label: 'Tứ Hóa năm sinh', path: 'houses[].tuHoa'}),
    Object.freeze({id: 'annual-transformation', label: 'Lưu Tứ Hóa năm xem', path: 'annual.luuTuHoa.items'}),
    Object.freeze({id: 'annual-star', label: 'Lưu tinh năm xem', path: 'annual.luuStars.items'}),
  ]);
  const optionalList = value => Array.isArray(value) ? value : [];
  function validateHouses(chart) {
    if (!chart || !Array.isArray(chart.houses) || chart.houses.length !== RING_SIZE) {
      throw new RangeError('Cần đúng 12 cung để dựng bằng chứng Tam phương Tứ chính');
    }
    const byBranch = new Map();
    for (const house of chart.houses) {
      if (!house || !validBranch(house.branchIndex) || byBranch.has(house.branchIndex) ||
          typeof house.palace !== 'string' || typeof house.branch !== 'string') {
        throw new RangeError('Địa bàn có chi trùng lặp hoặc không hợp lệ');
      }
      byBranch.set(house.branchIndex, house);
    }
    return byBranch;
  }
  function withPath(kind, name, branchIndex, path, transformation) {
    return {
      kind,
      name,
      branchIndex,
      path,
      ...(transformation ? {transformation} : {}),
    };
  }
  function placeResearch(chart, annual, branchIndex) {
    if (!validBranch(branchIndex)) throw new RangeError('Địa chi nghiên cứu phải nằm trong 0–11');
    const houses = validateHouses(chart);
    const selected = houses.get(branchIndex);
    const positions = [
      {role:'selected', branchIndex},
      {role:'tam-hop', branchIndex:mod(branchIndex+4)},
      {role:'tam-hop', branchIndex:mod(branchIndex+8)},
      {role:'opposite', branchIndex:mod(branchIndex+6)},
    ];
    const year = annual && Number.isInteger(annual.year) ? annual.year : null;
    const annualHoa = optionalList(annual?.luuTuHoa?.items);
    const annualStars = optionalList(annual?.luuStars?.items);
    const perspectives = positions.map(({role,branchIndex:branch}) => {
      const house = houses.get(branch);
      const layers = kinds.map(kind => {
        let records = [];
        if (kind.id === 'birth-transformation') {
          records = optionalList(house.tuHoa).filter(item => item && typeof item.name === 'string' && typeof item.star === 'string')
            .map(item => withPath(kind.id, item.star, branch, kind.path, item.name));
        } else if (kind.id === 'annual-transformation') {
          records = annualHoa.filter(item => item && item.branch === branch && typeof item.name === 'string' && typeof item.star === 'string')
            .map(item => withPath(kind.id, item.star, branch, kind.path, item.name));
        } else if (kind.id === 'annual-star') {
          records = annualStars.filter(item => item && item.branch === branch && typeof item.name === 'string')
            .map(item => withPath(kind.id, item.name, branch, kind.path));
        } else {
          const field = {main:'stars', auxiliary:'auxiliaryStars', year:'yearStars', additional:'additionalStars',traditional:'traditionalStars','benefic':'beneficStars','positional':'positionalStars','derived':'derivedStars','missing-stars':'missingStars','natal-extensions':'natalExtensionStars'}[kind.id];
          records = optionalList(house[field]).filter(name => typeof name === 'string' && name.length)
            .map(name => withPath(kind.id, name, branch, kind.path));
        }
        return {id:kind.id, label:kind.label, path:kind.path, records};
      });
      const natal = layers.filter(layer => !layer.id.startsWith('annual-'));
      const natalNames = new Set(natal.filter(layer => layer.id !== 'birth-transformation')
        .flatMap(layer => layer.records.map(record => record.name)));
      const transformationTargets = layers.filter(layer => layer.id.endsWith('transformation'))
        .flatMap(layer => layer.records.map(record => ({...record, targetPresentInNatal:natalNames.has(record.name)})));
      return {
        role, branchIndex:branch, branch:house.branch, palace:house.palace, stem:house.stem,
        layers, natalStarCount:[...natalNames].length, transformationTargets,
      };
    });
    return {
      ruleSet:RULESET,
      birthRuleSet:chart.ruleSet ?? null,
      annualRuleSet:annual?.ruleSet ?? null,
      annualYear:year,
      branchIndex,
      palace:selected.palace,
      perspectives,
      disclaimer:'Chỉ đối chiếu vị trí đồng cung, Tam phương Tứ chính và tên Tứ Hóa theo dữ liệu đã an; không suy ra cát hung hoặc lời luận giải cá nhân. Nguồn vị trí: các trường path trên từng lớp.',
    };
  }
  const api = Object.freeze({RULESET, layers:kinds, build:placeResearch});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ThienDoPalaceResearch = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
