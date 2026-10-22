/**
 * Typed CommonJS interface for the shared raster validator.
 * The implementation remains in raster-image-validation.cjs; declarations do
 * not change runtime validation or permitted image formats.
 */
export type RasterMime = 'image/jpeg' | 'image/png' | 'image/webp';
export type RasterDimensions = { width: number; height: number };
export type RasterInspection = RasterDimensions & { mime: RasterMime };

export declare function jpegDimensions(data: unknown): RasterDimensions | null;
export declare function pngDimensions(data: unknown): RasterDimensions | null;
export declare function webpDimensions(data: unknown): RasterDimensions | null;
export declare function inspectAvatar(data: unknown, contentType: unknown): RasterInspection | null;
export declare function rasterMime(data: unknown, format: unknown, maxBytes?: number): RasterMime | null;
