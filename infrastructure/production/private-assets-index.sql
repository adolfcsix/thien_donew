-- Read-only inventory. Run against the same quiesced DB as the dump, or restored DB.
SELECT COALESCE(json_agg(json_build_object('path', path, 'size', size, 'sha256', sha256) ORDER BY path), '[]'::json) AS asset_index
FROM (
 SELECT 'books/' || id::text AS path, size_bytes AS size, sha256 FROM library_assets
 UNION ALL
 SELECT 'van-kho-media/' || file_key::text AS path, content_bytes AS size, sha256 FROM van_kho_media
) AS files;
