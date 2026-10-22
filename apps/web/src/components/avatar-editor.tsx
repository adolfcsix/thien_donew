'use client';

import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent } from 'react';

type Props = { file: File; onCancel: () => void; onSave: (image: Blob) => Promise<void>; disabled?: boolean };
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const OUT_SIZE = 256;
const MAX_IMAGE_DIMENSION = 8192;
const MAX_IMAGE_PIXELS = 36_000_000;

export function validateAvatarFile(file: Pick<File, 'type' | 'size'> & { name?: string }) {
  const type = file.type.toLowerCase();
  // Some file pickers omit MIME. Decode the selected local image before exporting JPEG.
  const knownExtension = /\.(jpe?g|png|webp)$/i.test(file.name || '');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(type) && !(type === '' && knownExtension)) throw new Error('Hãy chọn ảnh JPG, PNG hoặc WebP. Với ảnh HEIC/HEIF, hãy xuất sang JPG trước khi tải lên.');
  if (file.size === 0) throw new Error('Ảnh đang trống. Hãy tải ảnh gốc về thiết bị rồi chọn lại.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Ảnh gốc phải nhỏ hơn 10 MB.');
}

/** Crop is previewed before upload; only the 256px JPEG is sent to the server. */
export function AvatarEditor({ file, onCancel, onSave, disabled = false }: Props) {
  const [url, setUrl] = useState('');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const image = useRef<HTMLImageElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const drag = useRef<{ pointerId: number; x: number; y: number; oldX: number; oldY: number } | null>(null);

  useEffect(() => {
    setReady(false);
    setError('');
    try { validateAvatarFile(file); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Ảnh không hợp lệ.'); return; }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId || !event.isPrimary) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const x = (event.clientX - drag.current.x) / box.width * 100;
    const y = (event.clientY - drag.current.y) / box.height * 100;
    setOffset({ x: Math.max(-100, Math.min(100, drag.current.oldX + x)), y: Math.max(-100, Math.min(100, drag.current.oldY + y)) });
  };

  function renderCrop(target: HTMLCanvasElement) {
    const img = image.current;
    if (!img?.naturalWidth || !img.naturalHeight) return false;
    // Avoid decoding/drawing giant images even if the user adjusts sliders
    // after the original upload was rejected by onLoad.
    if (img.naturalWidth > MAX_IMAGE_DIMENSION || img.naturalHeight > MAX_IMAGE_DIMENSION ||
        img.naturalWidth * img.naturalHeight > MAX_IMAGE_PIXELS) return false;
    const side = Math.min(img.naturalWidth, img.naturalHeight) / zoom;
    const maxX = (img.naturalWidth - side) / 2;
    const maxY = (img.naturalHeight - side) / 2;
    const sx = maxX - (offset.x / 100) * maxX;
    const sy = maxY - (offset.y / 100) * maxY;
    const ctx = target.getContext('2d');
    if (!ctx) return false;
    // Transparent PNG/WebP exports should not become black JPEG areas.
    ctx.clearRect(0, 0, OUT_SIZE, OUT_SIZE);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, OUT_SIZE, OUT_SIZE);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, OUT_SIZE, OUT_SIZE);
    return true;
  }

  useEffect(() => { if (canvas.current) renderCrop(canvas.current); }, [url, zoom, offset]);

  async function save() {
    if (!ready || !image.current?.naturalWidth || busy || disabled) return;
    setBusy(true);
    setError('');
    try {
      const output = document.createElement('canvas');
      output.width = OUT_SIZE;
      output.height = OUT_SIZE;
      if (!renderCrop(output)) throw new Error('Chưa đọc xong ảnh.');
      const blob = await new Promise<Blob | null>(resolve => output.toBlob(resolve, 'image/jpeg', 0.82));
      if (!blob || blob.size > 300 * 1024) throw new Error('Không thể nén ảnh dưới 300 KB.');
      await onSave(blob);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể lưu ảnh.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="avatar-editor" aria-label="Chỉnh ảnh đại diện">
    <div className="avatar-editor-stage" onPointerDown={event => {
        if (busy || disabled || !ready || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
        drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, oldX: offset.x, oldY: offset.y };
        event.currentTarget.setPointerCapture(event.pointerId);
      }} onPointerMove={move}
      onPointerUp={event => { if (drag.current?.pointerId === event.pointerId) drag.current = null; }}
      onPointerCancel={event => { if (drag.current?.pointerId === event.pointerId) drag.current = null; }}
      onLostPointerCapture={event => { if (drag.current?.pointerId === event.pointerId) drag.current = null; }}>
      {url && <img ref={image} src={url} alt="" draggable={false} hidden onLoad={event => {
        const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
        if (!width || !height || width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION || width * height > MAX_IMAGE_PIXELS) {
          setError('Kích thước ảnh quá lớn. Hãy chọn ảnh có cạnh tối đa 8192 px và tối đa 36 triệu điểm ảnh.');
          setReady(false);
          return;
        }
        setReady(true);
        if (canvas.current) renderCrop(canvas.current);
      }} onError={() => { setReady(false); setError('Không thể đọc ảnh. Hãy chọn JPG, PNG hoặc WebP còn nguyên vẹn.'); }} />}
      <canvas ref={canvas} width={OUT_SIZE} height={OUT_SIZE} role="img" aria-label="Xem trước ảnh đại diện đã cắt" />
      <div className="avatar-editor-mask" aria-hidden="true" />
    </div>
    <p className="account-control-hint">Kéo ảnh để căn khuôn mặt. Trên điện thoại, vuốt dọc để cuộn trang; chỉnh vị trí dọc bằng thanh trượt bên dưới.</p>
    <label className="account-control-label" htmlFor="avatar-zoom">Phóng ảnh <span>{Math.round(zoom * 100)}%</span></label>
    <input id="avatar-zoom" className="avatar-zoom" type="range" min={1} max={2.4} step={0.05} value={zoom} disabled={busy || disabled}
      onChange={(event: ChangeEvent<HTMLInputElement>) => setZoom(Number(event.target.value))} />
    <details className="account-avatar-position">
      <summary>Chỉnh vị trí chính xác</summary>
      <label className="account-control-label" htmlFor="avatar-position-x">Vị trí ngang</label>
      <input id="avatar-position-x" className="avatar-zoom" type="range" min={-100} max={100} step={2} value={offset.x}
        disabled={busy || disabled} onChange={event => setOffset(current => ({ ...current, x: Number(event.target.value) }))} />
      <label className="account-control-label" htmlFor="avatar-position-y">Vị trí dọc</label>
      <input id="avatar-position-y" className="avatar-zoom" type="range" min={-100} max={100} step={2} value={offset.y}
        disabled={busy || disabled} onChange={event => setOffset(current => ({ ...current, y: Number(event.target.value) }))} />
    </details>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="account-button-row"><button type="button" className="btn secondary" disabled={busy || disabled} onClick={onCancel}>Hủy</button>
      <button type="button" className="btn gold" disabled={!ready || busy || disabled} onClick={() => void save()}>{busy ? 'Đang lưu ảnh…' : 'Lưu ảnh đại diện'}</button></div>
  </section>;
}
