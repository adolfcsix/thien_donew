import type { AstrologyHouse } from '@thiendo/shared-types';

type ChartRelationNavigationProps = {
  selectedHouse: AstrologyHouse;
  tamHopHouses: AstrologyHouse[];
  doiCungHouse: AstrologyHouse | undefined;
  onSelect: (branchIndex: number) => void;
};

/** Pure navigation: receives already computed branch relationships. */
export function ChartRelationNavigation({
  selectedHouse, tamHopHouses, doiCungHouse, onSelect,
}: ChartRelationNavigationProps) {
  return <>
    <div className="atlas-relations" aria-label="Liên kết vị trí giữa các cung"><div className="atlas-relations-heading"><span className="eyebrow">ĐỐI CHIẾU ĐỊA BÀN</span><strong>Liên hệ cung {selectedHouse.palace}</strong><small>Chỉ thể hiện vị trí tương quan trên vòng 12 địa chi, không tự suy luận cát hung.</small></div><div className="atlas-relations-items"><span className="atlas-relation-label">Tam hợp</span>{tamHopHouses.map(house => <button key={house.branchIndex} type="button" className="atlas-relation-link" onClick={() => onSelect(house.branchIndex)}>{house.palace}<small>{house.stem} {house.branch}</small></button>)}<span className="atlas-relation-label">Đối cung</span>{doiCungHouse && <button type="button" className="atlas-relation-link atlas-opposition" onClick={() => onSelect(doiCungHouse.branchIndex)}>{doiCungHouse.palace}<small>{doiCungHouse.stem} {doiCungHouse.branch}</small></button>}</div></div>
  </>;
}
