export interface CircularLabelInput { id: string; angle: number }
export interface CircularLabelPosition extends CircularLabelInput { labelAngle: number }
export declare function normalize(angle: number): number;
export declare function layoutCircularLabels(items: CircularLabelInput[], minGap?: number): CircularLabelPosition[];
