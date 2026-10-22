export declare const MAX_BYTES: number;
export declare function validatedImage(data: unknown, contentType: unknown): 'image/jpeg'|'image/png'|'image/webp'|null;
export declare function hasMetadata(data:Buffer,format:'jpeg'|'png'|'webp'):boolean;
