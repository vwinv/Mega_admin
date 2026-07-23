"use client";

import { useEffect, useRef, useState } from "react";

type PdfPageViewerProps = {
  url: string;
  width: number;
  height: number;
  className?: string;
  onPageSize?: (size: { w: number; h: number }) => void;
};

type LoadedPdf = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any;
  baseW: number;
  baseH: number;
};

/**
 * Affiche la 1re page d'un PDF en canvas.
 * Chargement découplé du resize pour éviter la boucle « Chargement… ».
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
  const [useFallback, setUseFallback] = useState(false);
  const [loaded, setLoaded] = useState<LoadedPdf | null>(null);
  const onPageSizeRef = useRef(onPageSize);
  onPageSizeRef.current = onPageSize;
  const reported = useRef(false);

  // 1) Charger le PDF une seule fois par URL
  useEffect(() => {
    let cancelled = false;
    reported.current = false;
    setLoaded(null);
    setLoading(true);
    setError(null);
    setUseFallback(false);

    async function load() {
      try {
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) {
          let detail = `HTTP ${res.status}`;
          try {
            const j = (await res.json()) as { error?: string };
            if (j.error) detail = j.error;
          } catch {
            /* ignore */
          }
          throw new Error(detail);
        }
        const data = await res.arrayBuffer();
        if (cancelled) return;

        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const doc = await pdfjs.getDocument({ data: data.slice(0) }).promise;
        if (cancelled) return;
        const page = await doc.getPage(1);
        const base = page.getViewport({ scale: 1 });
        if (cancelled) return;

        setLoaded({
          doc,
          page,
          baseW: base.width,
          baseH: base.height,
        });
        if (!reported.current) {
          reported.current = true;
          onPageSizeRef.current?.({ w: base.width, h: base.height });
        }
      } catch (e) {
        if (cancelled) return;
        console.error("[PdfPageViewer] load", e);
        setUseFallback(true);
        setError(e instanceof Error ? e.message : "Chargement PDF impossible");
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [url]);

  // 2) Peindre quand dimensions + PDF prêts (resize = re-render sans re-fetch)
  useEffect(() => {
    if (!loaded || width <= 0 || height <= 0) return;
    let cancelled = false;

    async function paint() {
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const { page, baseW } = loaded!;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const scale = (width / baseW) * dpr;
        const viewport = page.getViewport({ scale });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas indisponible");

        const task = page.render({
          canvasContext: ctx,
          viewport,
          canvas,
        });
        await task.promise;
        if (!cancelled) {
          setLoading(false);
          setError(null);
        }
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        if (/Rendering cancelled/i.test(msg)) return;
        console.error("[PdfPageViewer] paint", e);
        setUseFallback(true);
        setError(msg);
        setLoading(false);
      }
    }

    void paint();
    return () => {
      cancelled = true;
    };
  }, [loaded, width, height]);

  if (useFallback) {
    return (
      <div className={`relative h-full w-full bg-white ${className}`}>
        <object
          data={`${url}#toolbar=0&navpanes=0&view=FitH`}
          type="application/pdf"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-label="Document PDF"
        >
          <iframe
            title="Document PDF"
            src={`${url}#toolbar=0&navpanes=0&view=FitH`}
            className="pointer-events-none absolute inset-0 h-full w-full border-0"
          />
        </object>
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full bg-white ${className}`}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm text-slate-500">
          Chargement du document…
        </div>
      )}
      {error && !loading && (
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
