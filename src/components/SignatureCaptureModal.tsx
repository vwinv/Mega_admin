"use client";

import { useEffect, useRef, useState } from "react";
import {
  Allura,
  Dancing_Script,
  Great_Vibes,
  Sacramento,
  Satisfy,
} from "next/font/google";
import { ChevronDown, ImageIcon, Keyboard, PenTool, Upload } from "lucide-react";
import { saveUserSignature } from "@/app/actions/signatures";
import { SignaturePad, type SignaturePadHandle } from "@/components/SignaturePad";
import { Button, Modal } from "@/components/ui";
import { makeSignatureBackgroundTransparent } from "@/lib/signature-image";

const greatVibes = Great_Vibes({ weight: "400", subsets: ["latin"] });
const dancingScript = Dancing_Script({ weight: "500", subsets: ["latin"] });
const satisfy = Satisfy({ weight: "400", subsets: ["latin"] });
const allura = Allura({ weight: "400", subsets: ["latin"] });
const sacramento = Sacramento({ weight: "400", subsets: ["latin"] });

export type SignatureCaptureMode = "taper" | "tracer" | "image";

type FontStyle = {
  id: string;
  label: string;
  className: string;
  family: string;
  sizePx: number;
};

const FONT_STYLES: FontStyle[] = [
  {
    id: "great-vibes",
    label: "Élégant",
    className: greatVibes.className,
    family: greatVibes.style.fontFamily,
    sizePx: 56,
  },
  {
    id: "dancing",
    label: "Classique",
    className: dancingScript.className,
    family: dancingScript.style.fontFamily,
    sizePx: 48,
  },
  {
    id: "satisfy",
    label: "Dynamique",
    className: satisfy.className,
    family: satisfy.style.fontFamily,
    sizePx: 48,
  },
  {
    id: "allura",
    label: "Fluide",
    className: allura.className,
    family: allura.style.fontFamily,
    sizePx: 54,
  },
  {
    id: "sacramento",
    label: "Script",
    className: sacramento.className,
    family: sacramento.style.fontFamily,
    sizePx: 52,
  },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Lecture fichier impossible"));
    reader.readAsDataURL(file);
  });
}

async function renderTypedSignature(
  text: string,
  style: FontStyle
): Promise<string> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 200;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111827";
  ctx.font = `${style.sizePx}px ${style.family}`;
  ctx.textBaseline = "alphabetic";
  const value = text.trim();
  ctx.fillText(value, 48, 120);

  // Recadrer autour de l'encre pour éviter un grand cadre vide
  const metrics = ctx.measureText(value);
  const pad = 16;
  const textW = Math.ceil(metrics.width) + pad * 2;
  const textH = Math.ceil(style.sizePx * 1.4) + pad * 2;
  const sx = Math.max(0, 48 - pad);
  const sy = Math.max(0, 120 - style.sizePx - pad / 2);
  const sw = Math.min(canvas.width - sx, textW);
  const sh = Math.min(canvas.height - sy, textH);

  const cropped = document.createElement("canvas");
  cropped.width = Math.max(sw, 40);
  cropped.height = Math.max(sh, 40);
  const cctx = cropped.getContext("2d");
  if (!cctx) return canvas.toDataURL("image/png");
  cctx.clearRect(0, 0, cropped.width, cropped.height);
  cctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
  return cropped.toDataURL("image/png");
}

type SignatureCaptureModalProps = {
  open: boolean;
  onClose: () => void;
  onApply: (imageDataUrl: string) => void | Promise<void>;
  defaultName: string;
  title?: string;
  /** Prefill / constrain for initials */
  variant?: "signature" | "initiales" | "image";
  savedSignature?: string | null;
  allowSave?: boolean;
  /** Prefill image tab (signature image déjà conservée) */
  initialImage?: string | null;
};

export function SignatureCaptureModal({
  open,
  onClose,
  onApply,
  defaultName,
  title = "Créer une signature",
  variant = "signature",
  savedSignature = null,
  allowSave = true,
  initialImage = null,
}: SignatureCaptureModalProps) {
  const padRef = useRef<SignaturePadHandle>(null);
  const [mode, setMode] = useState<SignatureCaptureMode>("taper");
  const [typedText, setTypedText] = useState(defaultName);
  const [styleId, setStyleId] = useState(FONT_STYLES[0].id);
  const [styleOpen, setStyleOpen] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [saveSignature, setSaveSignature] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const activeStyle =
    FONT_STYLES.find((s) => s.id === styleId) ?? FONT_STYLES[0];

  useEffect(() => {
    if (!open) return;
    setError(null);
    setStyleOpen(false);
    setSaveSignature(true);
    const prefImage = initialImage || savedSignature;
    if (variant === "image") {
      setMode("image");
      setUploadPreview(prefImage);
      setTypedText(defaultName);
    } else if (variant === "initiales") {
      setMode("taper");
      setUploadPreview(null);
      const parts = defaultName.trim().split(/\s+/).filter(Boolean);
      const ini =
        parts.length === 0
          ? "XX"
          : parts.length === 1
            ? parts[0].slice(0, 2).toUpperCase()
            : `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      setTypedText(ini);
    } else {
      setTypedText(defaultName);
      if (prefImage) {
        setMode("image");
        setUploadPreview(prefImage);
      } else {
        setMode("taper");
        setUploadPreview(null);
      }
    }
  }, [open, variant, defaultName, savedSignature, initialImage]);

  async function onPickImage(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Choisissez une image (PNG, JPG, WEBP…).");
      return;
    }
    if (f.size > 3 * 1024 * 1024) {
      setError("Image trop volumineuse (max 3 Mo).");
      return;
    }
    setUploadPreview(await fileToBase64(f));
    setError(null);
  }

  async function handleApply() {
    setError(null);
    setApplying(true);
    try {
      let image: string | null = null;

      if (mode === "taper") {
        const t = typedText.trim();
        if (!t) {
          setError(
            variant === "initiales"
              ? "Saisissez vos initiales."
              : "Saisissez votre nom."
          );
          setApplying(false);
          return;
        }
        image = await renderTypedSignature(t, activeStyle);
      } else if (mode === "tracer") {
        image = padRef.current?.toDataUrl() ?? null;
        if (!image) {
          setError("Tracez votre signature dans la zone.");
          setApplying(false);
          return;
        }
      } else {
        if (!uploadPreview) {
          setError("Ajoutez une image de signature.");
          setApplying(false);
          return;
        }
        image = uploadPreview;
      }

      // Fond transparent pour poser la signature sur le texte
      image = await makeSignatureBackgroundTransparent(image);

      if (allowSave && saveSignature) {
        const saved = await saveUserSignature(image);
        if (!saved.ok) {
          setError(saved.error);
          setApplying(false);
          return;
        }
      }

      await Promise.resolve(onApply(image));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'appliquer.");
    } finally {
      setApplying(false);
    }
  }

  const tabs: {
    id: SignatureCaptureMode;
    label: string;
    icon: typeof Keyboard;
  }[] = [
    { id: "taper", label: "Taper", icon: Keyboard },
    { id: "tracer", label: "Tracer", icon: PenTool },
    { id: "image", label: "Image", icon: ImageIcon },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        variant === "initiales"
          ? "Créer des initiales"
          : variant === "image"
            ? "Ajouter une image"
            : title
      }
      size="lg"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {allowSave ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={saveSignature}
                onChange={(e) => setSaveSignature(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#1473e6] focus:ring-[#1473e6]"
              />
              Enregistrer la signature
            </label>
          ) : (
            <span />
          )}
          <div className="flex justify-center gap-3 sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="min-w-[100px] rounded-full border border-slate-800 bg-white text-slate-900"
            >
              Annuler
            </Button>
            <Button
              type="button"
              disabled={applying}
              onClick={handleApply}
              className="min-w-[100px] rounded-full bg-[#1473e6] hover:bg-[#0d66d0]"
            >
              {applying ? "…" : "Appliquer"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Tabs Adobe-style */}
        <div className="flex justify-center gap-8 border-b border-slate-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setMode(tab.id);
                  setError(null);
                  setStyleOpen(false);
                }}
                className={`relative flex flex-col items-center gap-1.5 px-3 pb-3 pt-1 text-xs font-medium transition ${
                  active
                    ? "text-[#1473e6]"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
                {tab.label}
                {active && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#1473e6]" />
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {mode === "taper" && (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded border border-slate-300 bg-white">
              {/* Red Sign ribbon */}
              <div className="absolute left-0 top-0 z-10 flex h-full w-8 flex-col items-center bg-[#e34850] py-2 text-white shadow-sm">
                <span className="mb-1 text-[10px] font-bold leading-none">M</span>
                <span
                  className="mt-1 text-[9px] font-semibold uppercase tracking-wider"
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                  }}
                >
                  Sign
                </span>
              </div>

              <div className="relative min-h-[140px] pl-12 pr-4 pt-6 pb-10">
                <input
                  type="text"
                  value={typedText}
                  onChange={(e) =>
                    setTypedText(
                      variant === "initiales"
                        ? e.target.value.toUpperCase().slice(0, 6)
                        : e.target.value
                    )
                  }
                  maxLength={variant === "initiales" ? 6 : 80}
                  aria-label={
                    variant === "initiales" ? "Initiales" : "Nom à signer"
                  }
                  className={`w-full border-0 bg-transparent text-center text-[var(--c-blue-950)] outline-none placeholder:text-slate-300 ${activeStyle.className}`}
                  style={{
                    fontSize: variant === "initiales" ? "3rem" : "2.75rem",
                    lineHeight: 1.2,
                  }}
                  placeholder={
                    variant === "initiales" ? "MN" : "Votre nom"
                  }
                />
                <div className="pointer-events-none absolute bottom-8 left-12 right-4 h-px bg-[#5b9bd5]" />

                <div className="absolute bottom-2 right-3">
                  <button
                    type="button"
                    onClick={() => setStyleOpen((v) => !v)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#1473e6] hover:underline"
                  >
                    Modifier le style
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {styleOpen && (
                    <div className="absolute bottom-8 right-0 z-20 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                      {FONT_STYLES.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setStyleId(s.id);
                            setStyleOpen(false);
                          }}
                          className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                            s.id === styleId
                              ? "bg-blue-50 text-[#1473e6]"
                              : "text-slate-700"
                          } ${s.className}`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <p className="text-center text-xs text-slate-500">
              Cliquez sur le nom pour le modifier, puis choisissez un style.
            </p>
          </div>
        )}

        {mode === "tracer" && (
          <div className="overflow-hidden rounded border border-slate-300 bg-white">
            <div className="relative">
              <div className="absolute left-0 top-0 z-10 flex h-full w-8 flex-col items-center bg-[#e34850] py-2 text-white">
                <span className="mb-1 text-[10px] font-bold leading-none">M</span>
                <span
                  className="mt-1 text-[9px] font-semibold uppercase tracking-wider"
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                  }}
                >
                  Sign
                </span>
              </div>
              <div className="pl-10 pr-2 pt-2">
                <SignaturePad ref={padRef} height={160} width={520} />
              </div>
            </div>
          </div>
        )}

        {mode === "image" && (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded border border-slate-300 bg-white">
              <div className="absolute left-0 top-0 z-10 flex h-full w-8 flex-col items-center bg-[#e34850] py-2 text-white">
                <span className="mb-1 text-[10px] font-bold leading-none">M</span>
                <span
                  className="mt-1 text-[9px] font-semibold uppercase tracking-wider"
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                  }}
                >
                  Sign
                </span>
              </div>
              <label className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 pl-10 pr-4 py-8 hover:bg-slate-50">
                {uploadPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={uploadPreview}
                    alt="Aperçu signature"
                    className="max-h-28 object-contain"
                  />
                ) : (
                  <>
                    <Upload className="h-7 w-7 text-[#1473e6]" />
                    <span className="text-sm font-medium text-slate-700">
                      Choisir une image
                    </span>
                    <span className="text-xs text-slate-500">
                      PNG, JPG, WEBP · max 3 Mo
                    </span>
                  </>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => onPickImage(e.target.files)}
                />
              </label>
            </div>
            {uploadPreview && (
              <button
                type="button"
                className="text-sm text-[#1473e6] hover:underline"
                onClick={() => setUploadPreview(null)}
              >
                Changer l&apos;image
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
