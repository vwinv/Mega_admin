"use client";

import { useEffect, useRef, useState } from "react";
import "docx-preview/dist/docx-preview.css";

type DocxPageViewerProps = {
  url: string;
  width: number;
  height: number;
  className?: string;
  onPageSize?: (size: { w: number; h: number }) => void;
};

/**
 * Aperçu DOCX (Word) via docx-preview, pour placer les champs de signature.
 */
export function DocxPageViewer({
  url,
  width,
  height,
  className = "",
  onPageSize,
}: DocxPageViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const onPageSizeRef = useRef(onPageSize);
  onPageSizeRef.current = onPageSize;
  const reported = useRef(false);

  useEffect(() => {
    let cancelled = false;
    reported.current = false;
    setLoading(true);
    setError(null);

    async function load() {
      const host = hostRef.current;
      if (!host) return;
      host.innerHTML = "";

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

        const { renderAsync } = await import("docx-preview");
        await renderAsync(data, host, undefined, {
          className: "mega-docx",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          useBase64URL: true,
          renderHeaders: true,
          renderFooters: true,
        });
        if (cancelled) return;

        // Mesure la 1re « page » rendue (ou le conteneur entier)
        const pageEl =
          (host.querySelector(".mega-docx-wrapper > section") as HTMLElement) ||
          (host.querySelector("section") as HTMLElement) ||
          (host.firstElementChild as HTMLElement) ||
          host;
        const w = Math.max(pageEl.scrollWidth || pageEl.clientWidth || 794, 400);
        const h = Math.max(
          pageEl.scrollHeight || pageEl.clientHeight || 1123,
          560
        );
        if (!reported.current) {
          reported.current = true;
          onPageSizeRef.current?.({ w, h });
        }
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        console.error("[DocxPageViewer] load", e);
        setError(
          e instanceof Error
            ? e.message
            : "Aperçu Word impossible (utilisez .docx)"
        );
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-white ${className}`}
      style={{ width, height }}
    >
      <div
        ref={hostRef}
        className="docx-host absolute left-0 top-0 origin-top-left overflow-auto bg-white"
        style={{
          width: "100%",
          height: "100%",
        }}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/85 text-sm text-slate-500">
          Chargement du document Word…
        </div>
      )}
      {error && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-50 p-6 text-center text-sm text-slate-600">
          <p className="font-medium text-slate-800">Aperçu Word indisponible</p>
          <p className="max-w-sm text-xs text-slate-500">{error}</p>
          <p className="max-w-sm text-xs text-slate-500">
            Enregistrez le fichier en <strong>.docx</strong> (pas .doc) puis
            réessayez. Vous pouvez tout de même placer les champs.
          </p>
        </div>
      )}
    </div>
  );
}
