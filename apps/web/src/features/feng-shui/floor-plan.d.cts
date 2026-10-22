export declare const ZONES:readonly Readonly<{palace:number;direction:string}>[];
export declare const ROOM_TYPES:readonly string[];
export declare function blankFloorPlan():Readonly<Record<number,string>>;
export declare function assignRoom(plan:Readonly<Record<number,string>>,palace:number,room:string):Readonly<Record<number,string>>;
