import Engine from '../../packages/astrology-engine/src/index';
import type {AstrologyResult,TraditionalStarPlacement} from '@thiendo/shared-types';

const positions:TraditionalStarPlacement[] = Engine.calculateTraditionalStars({
  yearStem:0,yearBranch:0,lunarDay:15,vanXuongBranch:10,vanKhucBranch:4
});
const chart:AstrologyResult = Engine.calculate({
  date:'2004-08-15',hour:8,minute:30,gender:'Nam',calendar:'solar',leap:false
});
const supplemental:readonly string[] = chart.houses[0].traditionalStars??[];
const version:string|undefined = chart.traditionalStarRuleSet;
const allPlacements:readonly TraditionalStarPlacement[] = chart.traditionalStars??[];
void [positions,supplemental,version,allPlacements];
