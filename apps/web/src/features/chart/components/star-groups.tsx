import type { AstrologyHouse } from '@thiendo/shared-types';
import {starTone, toneLabels, type StarLayer} from '../lib/star-visuals';

/** Color and name are independent: no calculation or cát/hung judgment in the UI. */
export function AstrologyGroup({label, items, variant = 'normal', limit, layer = 'natal'}: {
  label: string; items: string[]; variant?: 'normal' | 'main' | 'gold' | 'year';
  limit?: number; layer?: StarLayer;
}) {
  const visible = typeof limit === 'number' ? items.slice(0, limit) : items;
  return <div className={`atlas-star-group atlas-${variant}`} title={label}>
    <span className="atlas-group-label">{label}</span>
    <div className="atlas-star-items">
      {visible.length ? visible.map((item, index) => {
        const tone = variant === 'main' && item !== 'Vô chính diệu' ? 'main' : starTone(item,label === 'LƯU NIÊN' ? 'annual' : layer);
        return <span key={`${item}-${index}`} className={`atlas-star atlas-star-kind-${tone}`} title={`${item} · ${toneLabels[tone]}`}>{item}</span>;
      }) : <span className="atlas-group-empty">—</span>}
      {visible.length < items.length && <span className="atlas-star-more">+{items.length-visible.length}</span>}
    </div>
  </div>;
}

/** Strength labels come from the engine; never recompute from colors. */
export function MainStarGroup({house,showStrength}:{house:AstrologyHouse;showStrength:boolean}) {
  return <div className="atlas-star-group atlas-main atlas-main-group">
    <span className="atlas-group-label">CHÍNH TINH</span>
    <span className="atlas-main-star-list">
      {house.stars.length ? house.stars.map((name,index) => {
        const placement=showStrength ? house.mainStarStrengths?.find(item => item.name===name) : undefined;
        return <span className="atlas-main-star-entry atlas-star-kind-main" key={`${name}-${index}`}>
          <strong>{name}</strong>
          {placement && <span className={`atlas-strength-badge atlas-strength-${placement.status.toLowerCase()}`}
            title={placement.label} aria-label={`${name}: ${placement.label}`}>{placement.status === 'D' ? 'Đ' : placement.status}</span>}
        </span>;
      }) : <span className="atlas-main-star-empty">Vô chính diệu</span>}
    </span>
  </div>;
}
