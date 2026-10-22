import { relatedBranches } from './palace-relations';
import type { PalaceFocusScope } from './palace-focus';

/** One line per relationship, anchored by a stable địa-chi index, not array order. */
export type PalaceRelationEdge = Readonly<{
  fromBranch: number;
  toBranch: number;
  kind: 'tam-hop' | 'doi-cung';
}>;

export function palaceRelationEdges(
  availableBranches: readonly number[],
  selectedBranch: number,
  scope: PalaceFocusScope,
): PalaceRelationEdge[] {
  const { tamHop, doiCung } = relatedBranches(selectedBranch);
  if (scope === 'single') return [];
  const available = new Set(availableBranches);
  if (!available.has(selectedBranch)) return [];
  const lines: PalaceRelationEdge[] = tamHop.filter(branch => available.has(branch)).map(branch => ({
    fromBranch: selectedBranch,
    toBranch: branch,
    kind: 'tam-hop' as const,
  }));
  if (scope === 'tu-chinh' && available.has(doiCung)) {
    lines.push({fromBranch:selectedBranch,toBranch:doiCung,kind:'doi-cung'});
  }
  return lines;
}

export type BoxBounds = Readonly<{left:number;top:number;right:number;bottom:number}>;
export type Point = Readonly<{x:number;y:number}>;

/** Use the *inner* tile boundary, so a connection does not cross the star labels. */
export function inwardEdgePoint(tile: BoxBounds, board: BoxBounds): Point {
  const middleX = (tile.left + tile.right) / 2;
  const middleY = (tile.top + tile.bottom) / 2;
  const centerX = (board.left + board.right) / 2;
  const centerY = (board.top + board.bottom) / 2;
  const tileWidth = tile.right - tile.left;
  const tileHeight = tile.bottom - tile.top;
  const offset = Math.min(6, tileWidth/10, tileHeight/10);
  const horizontal = Math.abs(middleX-centerX) > tileWidth * .9;
  const vertical = Math.abs(middleY-centerY) > tileHeight * .9;
  return {
    x: (horizontal ? (middleX < centerX ? tile.right-offset : tile.left+offset) : middleX) - board.left,
    y: (vertical ? (middleY < centerY ? tile.bottom-offset : tile.top+offset) : middleY) - board.top,
  };
}

/**
 * Route around the perimeter of the central profile instead of drawing over
 * names, stars or its birth-data labels. The returned path is SVG-only geometry.
 */
export function perimeterRelationPath(start: Point, end: Point, center: BoxBounds, inset: number): string {
  const left = center.left + inset, right = center.right - inset;
  const top = center.top + inset, bottom = center.bottom - inset;
  if (right <= left || bottom <= top) return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  const width = right-left, height = bottom-top, perimeter = 2*(width+height);
  const clamp = (value:number,min:number,max:number) => Math.max(min,Math.min(max,value));
  const fmt = (value:number) => Number(value.toFixed(2));
  const project = (p:Point) => {
    const candidates = [
      {point:{x:clamp(p.x,left,right),y:top}, s:clamp(p.x,left,right)-left},
      {point:{x:right,y:clamp(p.y,top,bottom)}, s:width+clamp(p.y,top,bottom)-top},
      {point:{x:clamp(p.x,left,right),y:bottom}, s:width+height+right-clamp(p.x,left,right)},
      {point:{x:left,y:clamp(p.y,top,bottom)}, s:2*width+height+bottom-clamp(p.y,top,bottom)},
    ];
    return candidates.reduce((best,candidate) => {
      const d = (candidate.point.x-p.x)**2+(candidate.point.y-p.y)**2;
      const bestDistance = (best.point.x-p.x)**2+(best.point.y-p.y)**2;
      return d < bestDistance ? candidate : best;
    });
  };
  const from = project(start), to = project(end);
  const clockwiseDistance = (to.s-from.s+perimeter)%perimeter;
  const clockwise = clockwiseDistance <= perimeter/2;
  const endS = clockwise ? from.s+clockwiseDistance : from.s-(perimeter-clockwiseDistance);
  const corners = [
    {s:0,point:{x:left,y:top}},
    {s:width,point:{x:right,y:top}},
    {s:width+height,point:{x:right,y:bottom}},
    {s:2*width+height,point:{x:left,y:bottom}},
  ];
  const intermediate:{s:number;point:Point}[]=[];
  for(let cycle=-2;cycle<=2;cycle++)for(const corner of corners){
    const s=corner.s+cycle*perimeter;
    if (clockwise ? s>from.s+0.01&&s<endS-0.01 : s<from.s-0.01&&s>endS+0.01) intermediate.push({s,point:corner.point});
  }
  intermediate.sort((a,b)=>clockwise?a.s-b.s:b.s-a.s);
  return [start,from.point,...intermediate.map(p=>p.point),to.point,end]
    .map((point,index)=>`${index===0?'M':'L'} ${fmt(point.x)} ${fmt(point.y)}`).join(' ');
}

/** Gentle quadratic guide: still joins the same Tam hợp / Đối cung anchors.
 * The guide has no interpretive meaning; curvature is solely presentational. */
export function softRelationPath(start: Point, end: Point, bend = 0.045): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx,dy);
  if (!Number.isFinite(distance) || distance < 1) return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  const offset = Math.min(19,distance * Math.abs(bend));
  const sign = bend < 0 ? -1 : 1;
  const normalX = -dy/distance;
  const normalY = dx/distance;
  const controlX = (start.x+end.x)/2 + normalX*offset*sign;
  const controlY = (start.y+end.y)/2 + normalY*offset*sign;
  const f = (n: number) => Number(n.toFixed(2));
  return `M ${f(start.x)} ${f(start.y)} Q ${f(controlX)} ${f(controlY)} ${f(end.x)} ${f(end.y)}`;
}


/**
 * Rounded thread around the *outer margin* of the central identity panel.
 * The route is derived from the existing tested perimeter geometry; only the
 * visual joins are eased. Crucially, the title and birth-data core are not
 * crossed by diagonal lines. No astrology logic lives in this function.
 */
export function silkPerimeterRelationPath(
  start: Point,
  end: Point,
  center: BoxBounds,
  inset: number,
  radius = 10,
): string {
  const base = perimeterRelationPath(start, end, center, inset);
  const points = [...base.matchAll(/[ML]\s+(-?[\d.]+)\s+(-?[\d.]+)/g)]
    .map(match => ({x:Number(match[1]), y:Number(match[2])}));
  if (points.length < 3 || points.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) return base;
  const f = (n:number) => Number(n.toFixed(2));
  const result = [`M ${f(points[0].x)} ${f(points[0].y)}`];
  for (let i=1; i<points.length-1; i++) {
    const before = points[i-1], point = points[i], after = points[i+1];
    const inLength = Math.hypot(point.x-before.x,point.y-before.y);
    const outLength = Math.hypot(after.x-point.x,after.y-point.y);
    if (inLength < .1 || outLength < .1) {
      result.push(`L ${f(point.x)} ${f(point.y)}`);
      continue;
    }
    // A limited rounding radius preserves lanes 12/20/28px from the edge.
    const cut = Math.min(Math.max(0,radius),inLength*.28,outLength*.28);
    const a = {x:point.x+(before.x-point.x)*cut/inLength,y:point.y+(before.y-point.y)*cut/inLength};
    const b = {x:point.x+(after.x-point.x)*cut/outLength,y:point.y+(after.y-point.y)*cut/outLength};
    result.push(`L ${f(a.x)} ${f(a.y)}`);
    result.push(`Q ${f(point.x)} ${f(point.y)} ${f(b.x)} ${f(b.y)}`);
  }
  result.push(`L ${f(end.x)} ${f(end.y)}`);
  return result.join(' ');
}


/**
 * Direct straight guide like a traditional tử vi chart.
 * The visual SVG route is exactly one line segment between the inner-facing
 * palace edges; no bends, curves or intermediate waypoints. Presentation only.
 */
export function straightRelationPath(start: Point, end: Point): string {
  if (![start.x,start.y,end.x,end.y].every(Number.isFinite)) return '';
  const f = (value:number) => Number(value.toFixed(2));
  return `M ${f(start.x)} ${f(start.y)} L ${f(end.x)} ${f(end.y)}`;
}
