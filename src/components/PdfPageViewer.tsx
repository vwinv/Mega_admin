"use client";

import { useEffect, useRef, useState } from "react";

type PdfPageViewerProps = {
  url: string;
  width: number;
  height: number;
  className?: string;
  onPageSize?: (size: { w: number; h: number }) => void;
};

/**
 * Affiche la 1re page d'un PDF en canvas (fiable pour les overlays de signature).
 */
export function PdfPageViewer({
  url,
  width,
  height,
  className = "",
  onPageSize,
}: PdfPageViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const onPageSizeRef = useRef(onPageSize);
  onPageSizeRef.current = onPageSize;

  useEffect(() => {
    let cancelled = false;
    let cancelRender: (() => void) | null = null;

    async function render() {
      setLoading(true);
      setError(null);
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        // Worker servi depuis /public (fiable avec Next/Webpack)
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        // Détecte tôt les 404 JSON (fichier absent)
        const probe = await fetch(url, { credentials: "include" });
        if (!probe.ok) {
          let detail = `HTTP ${probe.status}`;
          try {
            const j = (await probe.json()) as { error?: string };
            if (j.error) detail = j.error;
          } catch {
            /* ignore */
          }
          throw new Error(detail);
        }

        const loadingTask = pdfjs.getDocument({
          url,
          withCredentials: true,
        });
        const doc = await loadingTask.promise;
        if (cancelled) {
          await loadingTask.destroy().catch(() => undefined);
          return;
        }

        const page = await doc.getPage(1);
        const base = page.getViewport({ scale: 1 });
        onPageSizeRef.current?.({ w: base.width, h: base.height });

        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const scale = (width / base.width) * dpr;
        const viewport = page.getViewport({ scale });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setError("Canvas indisponible");
          return;
        }

        const task = page.render({
          canvasContext: ctx,
          viewport,
          // pdf.js v4+
          canvas,
        } as Parameters<typeof page.render>[0]);
        cancelRender = () => {
          try {
            task.cancel();
          } catch {
            /* ignore */
          }
        };
        await task.promise;
        cancelRender = null;
        if (!cancelled) setLoading(false);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        if (/Rendering cancelled/i.test(msg)) return;
        console.error("[PdfPageViewer]", e);
        setError(msg || "Impossible d'afficher le PDF");
        setLoading(false);
      }
    }

    if (width > 0 && height > 0) {
      void render();
    }

    return () => {
      cancelled = true;
      cancelRender?.();
    };
  }, [url, width, height]);

  return (
    <div className={`relative h-full w-full bg-white ${className}`}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm text-slate-500">
          Chargement du document…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-50 p-6 text-center text-sm text-slate-600">
          <p className="font-medium text-slate-800">Document indisponible</p>
          <p className="max-w-sm text-xs text-slate-500">{error}</p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-blue-600 underline"
          >
            Ouvrir / télécharger le PDF
          </a>
        </div>
      )}
    </div>
  );
}
