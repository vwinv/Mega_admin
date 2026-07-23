"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui";

export type SignaturePadHandle = {
  clear: () => void;
  isEmpty: () => boolean;
  toDataUrl: () => string | null;
};

type SignaturePadProps = {
  width?: number;
  height?: number;
  initialImage?: string | null;
  onChange?: (isEmpty: boolean) => void;
};

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad(
    { width = 480, height = 160, initialImage, onChange },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const hasInk = useRef(false);

    function notifyEmpty() {
      onChange?.(!hasInk.current);
    }

    function getCtx() {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return canvas.getContext("2d");
    }

    function clearCanvas() {
      const canvas = canvasRef.current;
      const ctx = getCtx();
      if (!canvas || !ctx) return;
      // Fond transparent pour superposer la signature sur le document
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#0e2433";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      hasInk.current = false;
      notifyEmpty();
    }

    function loadImage(dataUrl: string) {
      const canvas = canvasRef.current;
      const ctx = getCtx();
      if (!canvas || !ctx) return;
      const img = new Image();
      img.onload = () => {
        clearCanvas();
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        hasInk.current = true;
        notifyEmpty();
      };
      img.src = dataUrl;
    }

    useEffect(() => {
      clearCanvas();
      if (initialImage) loadImage(initialImage);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialImage]);

    useImperativeHandle(ref, () => ({
      clear: clearCanvas,
      isEmpty: () => !hasInk.current,
      toDataUrl: () => {
        if (!hasInk.current) return null;
        const canvas = canvasRef.current;
        if (!canvas) return null;
        return canvas.toDataURL("image/png");
      },
    }));

    function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }

    function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
      e.preventDefault();
      const ctx = getCtx();
      if (!ctx) return;
      drawing.current = true;
      canvasRef.current?.setPointerCapture(e.pointerId);
      const { x, y } = pointerPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    function draw(e: React.PointerEvent<HTMLCanvasElement>) {
      if (!drawing.current) return;
      e.preventDefault();
      const ctx = getCtx();
      if (!ctx) return;
      const { x, y } = pointerPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      hasInk.current = true;
      notifyEmpty();
    }

    function endDraw(e: React.PointerEvent<HTMLCanvasElement>) {
      if (!drawing.current) return;
      drawing.current = false;
      canvasRef.current?.releasePointerCapture(e.pointerId);
      notifyEmpty();
    }

    return (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-lg border-2 border-dashed border-[var(--border-strong)] bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0]">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="block w-full touch-none cursor-crosshair bg-transparent"
            style={{ height: `${height}px` }}
            onPointerDown={startDraw}
            onPointerMove={draw}
            onPointerUp={endDraw}
            onPointerLeave={endDraw}
            aria-label="Zone de signature"
          />
        </div>
        <p className="text-xs text-[var(--muted)]">
          Signez avec la souris ou le doigt dans la zone ci-dessus.
        </p>
        <Button type="button" variant="secondary" className="text-xs" onClick={clearCanvas}>
          Effacer
        </Button>
      </div>
    );
  }
);

export function SignaturePreview({ imageData }: { imageData: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageData}
      alt="Signature"
      className="max-h-24 rounded border border-[var(--border)] bg-white p-2"
    />
  );
}
