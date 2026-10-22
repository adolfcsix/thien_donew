'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { AstrologyHouse } from '@thiendo/shared-types';
import type { PalaceFocusScope } from '../lib/palace-focus';
import { inwardEdgePoint, palaceRelationEdges, straightRelationPath, type Point, type PalaceRelationEdge } from '../lib/palace-relation-lines';
import { interpolatePoint } from '../lib/relation-motion';

type Props = {
  houses: readonly AstrologyHouse[];
  /** null keeps the SVG mounted while fading out when no palace is hovered. */
  selectedBranch: number | null;
  scope: PalaceFocusScope;
  boardRef: RefObject<HTMLDivElement | null>;
};
type DrawnEdge = PalaceRelationEdge & { start: Point; end: Point; path: string };
type Layer = { width: number; height: number; edges: DrawnEdge[] };
const TRANSITION_MS = 230;

function drawEdge(
  edge: PalaceRelationEdge, start: Point, end: Point,
) : DrawnEdge {
  // Direct linear connection; preserve the stable 230ms anchor interpolation.
  const path = straightRelationPath(start,end);
  return { ...edge, start, end, path };
}

/** Stable SVG overlay: interpolate anchor positions instead of replacing the entire layer on hover. */
export function PalaceRelationLines({ houses, selectedBranch, scope, boardRef }: Props) {
  const edges = useMemo(() => selectedBranch === null ? [] : palaceRelationEdges(houses.map(h => h.branchIndex), selectedBranch, scope), [houses, selectedBranch, scope]);
  const [layer, setLayer] = useState<Layer | null>(null);
  const [visible, setVisible] = useState(false);
  const layerRef = useRef<Layer | null>(null);
  const measureFrame = useRef<number | null>(null);
  const motionFrame = useRef<number | null>(null);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const stop = () => {
      if (measureFrame.current !== null) cancelAnimationFrame(measureFrame.current);
      if (motionFrame.current !== null) cancelAnimationFrame(motionFrame.current);
      measureFrame.current = null;
      motionFrame.current = null;
    };
    if (edges.length === 0) {
      stop();
      setVisible(false);
      // Preserve the final geometry while CSS softly fades it to transparent.
      return stop;
    }

    const center = board.querySelector<HTMLElement>('.atlas-center');
    const watched = [board, ...(center ? [center] : []), ...houses.map(h => board.querySelector<HTMLElement>(`#palace-${h.branchIndex}`)).filter((tile):tile is HTMLElement => Boolean(tile))];
    const redraw = () => {
      const bounds = board.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) { setVisible(false); return; }
      const points = new Map<number, Point>();
      for (const house of houses) {
        const tile = board.querySelector<HTMLElement>(`#palace-${house.branchIndex}`);
        if (tile) points.set(house.branchIndex, inwardEdgePoint(tile.getBoundingClientRect(), bounds));
      }
      const target:Layer = {
        width: bounds.width,
        height: bounds.height,
        edges: edges.flatMap((edge) => {
          const start = points.get(edge.fromBranch);
          const end = points.get(edge.toBranch);
          return start && end ? [drawEdge(edge,start,end)] : [];
        }),
      };
      if (motionFrame.current !== null) cancelAnimationFrame(motionFrame.current);
      motionFrame.current = null;
      const previous = layerRef.current;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      // Morph only comparable connection sets; scope changes simply crossfade to the new group.
      if (reduced || !previous || previous.edges.length !== target.edges.length ||
          previous.edges.some((edge,i) => edge.kind !== target.edges[i].kind)) {
        layerRef.current = target;
        setLayer(target);
        setVisible(true);
        return;
      }
      const startTime = performance.now();
      const tick = (now:number) => {
        const progress = Math.min(1,(now-startTime)/TRANSITION_MS);
        const next:Layer = {
          width: target.width, height: target.height,
          edges: target.edges.map((edge,i) => drawEdge(
            edge,
            interpolatePoint(previous.edges[i].start,edge.start,progress),
            interpolatePoint(previous.edges[i].end,edge.end,progress),
          )),
        };
        layerRef.current = next;
        setLayer(next);
        if (progress < 1) motionFrame.current = requestAnimationFrame(tick);
        else motionFrame.current = null;
      };
      setVisible(true);
      motionFrame.current = requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (measureFrame.current !== null) cancelAnimationFrame(measureFrame.current);
      measureFrame.current = requestAnimationFrame(() => {
        measureFrame.current = null;
        redraw();
      });
    };
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    watched.forEach(element => observer?.observe(element));
    window.addEventListener('resize',schedule);
    schedule();
    return () => { observer?.disconnect(); window.removeEventListener('resize',schedule); stop(); };
  }, [boardRef, edges, houses]);

  return <svg className="chart-relation-lines" data-visible={visible && Boolean(layer?.edges.length)}
    xmlns="http://www.w3.org/2000/svg" width={layer?.width ?? 0} height={layer?.height ?? 0}
    viewBox={`0 0 ${layer?.width ?? 1} ${layer?.height ?? 1}`} aria-hidden="true" focusable="false">
    {layer?.edges.map((edge,index) => <g key={`${edge.kind}-${index}`} className={`chart-relation-path chart-relation-${edge.kind}`}>
      <path className="chart-relation-halo" d={edge.path} />
      <path className="chart-relation-stroke" d={edge.path} />
      <circle cx={edge.start.x} cy={edge.start.y} r="3.2" />
      <circle cx={edge.end.x} cy={edge.end.y} r="3.2" />
    </g>)}
  </svg>;
}
