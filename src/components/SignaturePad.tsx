import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

export interface SignaturePadHandle {
  /** Returns a PNG data URL of the current strokes, or null if the pad is empty. */
  toDataUrl(): string | null;
  /** Clears the pad. */
  clear(): void;
  /** True if no strokes have been drawn. */
  isEmpty(): boolean;
}

interface SignaturePadProps {
  width?: number;
  height?: number;
  ariaLabel?: string;
}

/**
 * Lightweight in-browser signature capture.
 *
 * - HTML5 canvas with pointer-event hooks so mouse / pen / touch all work.
 * - No external dependency -- the codebase explicitly prefers first-party
 *   code for security review surface area.
 * - Caller-controlled clear + serialize via the forwarded ref handle.
 */
export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad(
  { width = 480, height = 160, ariaLabel = 'Signature pad' },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // White background so the exported PNG looks like ink-on-paper.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  useImperativeHandle(ref, () => ({
    toDataUrl: () => {
      if (empty) return null;
      return canvasRef.current?.toDataURL('image/png') ?? null;
    },
    clear: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setEmpty(true);
    },
    isEmpty: () => empty,
  }));

  const pointToCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawing.current = true;
    lastPoint.current = pointToCanvas(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext('2d');
    if (!ctx || !lastPoint.current) return;
    const next = pointToCanvas(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    lastPoint.current = next;
    if (empty) setEmpty(false);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = false;
    lastPoint.current = null;
    canvasRef.current?.releasePointerCapture(e.pointerId);
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      role="img"
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onPointerCancel={onPointerUp}
      className="bg-white border border-slate-300 rounded touch-none cursor-crosshair"
      style={{ width: '100%', maxWidth: width, height }}
    />
  );
});
