"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Check,
  Download,
  ImageIcon,
  Maximize2,
  Menu,
  Minus,
  MoreVertical,
  PenLine,
  Plus,
  Printer,
  RectangleHorizontal,
  RectangleVertical,
  Redo2,
  RotateCw,
  Type,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { saveSelfSignedDocument } from "@/app/actions/signature-docs";
import { SignatureCaptureModal } from "@/components/SignatureCaptureModal";
import { usePermissions } from "@/components/PermissionsProvider";
import {
  Alert,
  Button,
  Card,
  Input,
  PageHeader,
} from "@/components/ui";
import {
  composeSignatureReturnStamp,
  initialsFromName,
} from "@/lib/signature-image";

type Tool = "SIGNATURE" | "PARAPHE" | "DATE" | "TEXTE" | "COCHE" | "IMAGE";

type Annotation = {
  id: string;
  type: Tool;
  valeur: string;
  posX: number;
  posY: number;
  largeur: number;
  hauteur: number;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Lecture fichier impossible"));
    reader.readAsDataURL(file);
  });
}

const SIZES: Record<Tool, { w: number; h: number }> = {
  SIGNATURE: { w: 0.32, h: 0.1 },
  PARAPHE: { w: 0.14, h: 0.07 },
  DATE: { w: 0.16, h: 0.05 },
  TEXTE: { w: 0.28, h: 0.05 },
  COCHE: { w: 0.04, h: 0.04 },
  IMAGE: { w: 0.2, h: 0.12 },
};

const KEPT_SIGNATURE_KEY = "mega-swa-kept-signature";
const KEPT_IMAGE_KEY = "mega-swa-kept-image-stamp";

function readKept(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(key);
    return v?.startsWith("data:image/") ? v : null;
  } catch {
    return null;
  }
}

function writeKept(key: string, dataUrl: string) {
  try {
    localStorage.setItem(key, dataUrl);
  } catch {
    // quota — ignore
  }
}

const ZOOM_MIN = 40;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;

function ToolbarBtn({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded transition ${
        active
          ? "bg-white/20 text-white"
          : "text-white/90 hover:bg-white/10"
      } disabled:cursor-not-allowed disabled:opacity-35`}
    >
      {children}
    </button>
  );
}

export function SignatureEditorClient({
  savedSignature,
}: {
  savedSignature: string | null;
}) {
  const router = useRouter();
  const { user } = usePermissions();
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const resizeRef = useRef<{
    id: string;
    corner: "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";
    startX: number;
    startY: number;
    orig: Annotation;
  } | null>(null);
  const movedDuringDrag = useRef(false);

  const MIN_W = 0.05;
  const MIN_H = 0.03;

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [titre, setTitre] = useState("");
  const [tool, setTool] = useState<Tool>("SIGNATURE");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [history, setHistory] = useState<Annotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [keptSignature, setKeptSignature] = useState<string | null>(null);
  const [keptImageStamp, setKeptImageStamp] = useState<string | null>(null);
  const [useKeptOnClick, setUseKeptOnClick] = useState(true);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  const [zoom, setZoom] = useState(86);
  const [rotation, setRotation] = useState(0);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    "portrait"
  );
  const [naturalSize, setNaturalSize] = useState({ w: 794, h: 1123 }); // A4 portrait px

  const pageSize = useMemo(() => {
    const { w, h } = naturalSize;
    const natLandscape = w >= h;
    if (orientation === "landscape") {
      return natLandscape ? { w, h } : { w: Math.max(h, 320), h: Math.max(w, 320) };
    }
    return natLandscape ? { w: Math.max(h, 320), h: Math.max(w, 320) } : { w, h };
  }, [naturalSize, orientation]);

  const [sigModal, setSigModal] = useState(false);
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [pendingTool, setPendingTool] = useState<"SIGNATURE" | "PARAPHE" | "IMAGE">(
    "SIGNATURE"
  );
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);

  useEffect(() => {
    const local = readKept(KEPT_SIGNATURE_KEY);
    setKeptSignature(local || savedSignature);
    setKeptImageStamp(readKept(KEPT_IMAGE_KEY));
  }, [savedSignature]);

  useEffect(() => {
    if (!editingTextId) return;
    const t = window.setTimeout(() => textInputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [editingTextId]);

  const isImage = Boolean(file?.type.startsWith("image/"));
  const isPdf = Boolean(
    file?.type === "application/pdf" || file?.name.toLowerCase().endsWith(".pdf")
  );

  const tools = useMemo(
    () =>
      [
        { id: "SIGNATURE" as Tool, label: "Signature", icon: PenLine },
        { id: "PARAPHE" as Tool, label: "Initiales", icon: Type },
        { id: "IMAGE" as Tool, label: "Image", icon: ImageIcon },
        { id: "DATE" as Tool, label: "Date", icon: Calendar },
        { id: "TEXTE" as Tool, label: "Texte", icon: Type },
        { id: "COCHE" as Tool, label: "Coche", icon: Check },
      ] as const,
    []
  );

  const historyIndexRef = useRef(0);
  historyIndexRef.current = historyIndex;

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const pushHistory = useCallback((snapshot: Annotation[]) => {
    const idx = historyIndexRef.current;
    setHistory((h) => [...h.slice(0, idx + 1), snapshot]);
    setHistoryIndex(idx + 1);
  }, []);

  const commitAnnotations = useCallback(
    (next: Annotation[] | ((prev: Annotation[]) => Annotation[])) => {
      setAnnotations((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        pushHistory(resolved);
        return resolved;
      });
    },
    [pushHistory]
  );

  function undo() {
    if (!canUndo) return;
    const next = historyIndex - 1;
    setHistoryIndex(next);
    setAnnotations(history[next] ?? []);
    setSelectedId(null);
  }

  function redo() {
    if (!canRedo) return;
    const next = historyIndex + 1;
    setHistoryIndex(next);
    setAnnotations(history[next] ?? []);
  }

  function onPickFile(f: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setAnnotations([]);
    setHistory([[]]);
    setHistoryIndex(0);
    setSelectedId(null);
    setRotation(0);
    setZoom(86);
    setOrientation("portrait");
    if (f) {
      setTitre(f.name.replace(/\.[^.]+$/, ""));
      if (f.type.startsWith("image/") || f.type === "application/pdf") {
        setPreviewUrl(URL.createObjectURL(f));
      } else {
        setPreviewUrl(null);
      }
    } else {
      setTitre("");
      setPreviewUrl(null);
    }
  }

  // Measure natural image size for fit-page
  useEffect(() => {
    if (!previewUrl || !isImage) {
      setNaturalSize({ w: 794, h: 1123 });
      setOrientation("portrait");
      return;
    }
    const img = new Image();
    img.onload = () => {
      const w = Math.max(img.naturalWidth, 320);
      const h = Math.max(img.naturalHeight, 320);
      setNaturalSize({ w, h });
      setOrientation(w >= h ? "landscape" : "portrait");
    };
    img.src = previewUrl;
  }, [previewUrl, isImage]);

  const fitPage = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const pad = 48;
    const availW = Math.max(vp.clientWidth - pad, 200);
    const availH = Math.max(vp.clientHeight - pad, 200);
    const rotated = rotation % 180 !== 0;
    const docW = rotated ? pageSize.h : pageSize.w;
    const docH = rotated ? pageSize.w : pageSize.h;
    const z = Math.floor(Math.min(availW / docW, availH / docH) * 100);
    setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)));
  }, [pageSize.h, pageSize.w, rotation]);

  const fitWidth = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const pad = 48;
    const availW = Math.max(vp.clientWidth - pad, 200);
    const rotated = rotation % 180 !== 0;
    const docW = rotated ? pageSize.h : pageSize.w;
    const z = Math.floor((availW / docW) * 100);
    setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)));
  }, [pageSize.h, pageSize.w, rotation]);

  function applyOrientation(next: "portrait" | "landscape") {
    setOrientation(next);
    setRotation(0);
  }
  // Fit whole page when file / size / orientation ready
  useEffect(() => {
    if (!file) return;
    const t = window.setTimeout(() => fitPage(), 80);
    return () => window.clearTimeout(t);
  }, [file, pageSize.w, pageSize.h, orientation, fitPage]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!file) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (meta && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (e.key === "+" || e.key === "=") {
        if (meta) {
          e.preventDefault();
          setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP));
        }
      } else if (e.key === "-" && meta) {
        e.preventDefault();
        setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP));
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId && !(e.target instanceof HTMLInputElement)) {
          e.preventDefault();
          deleteSelected();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, selectedId, canUndo, canRedo, history, historyIndex]);

  function placeAnnotation(
    x: number,
    y: number,
    valeur: string,
    type: Tool,
    opts?: { editText?: boolean }
  ) {
    const s = SIZES[type];
    const id = crypto.randomUUID();
    const row: Annotation = {
      id,
      type,
      valeur,
      posX: Math.min(Math.max(x - s.w / 2, 0), 1 - s.w),
      posY: Math.min(Math.max(y - s.h / 2, 0), 1 - s.h),
      largeur: s.w,
      hauteur: s.h,
    };
    commitAnnotations((rows) => [...rows, row]);
    if (opts?.editText) {
      setSelectedId(id);
      setEditingTextId(id);
    } else {
      setSelectedId(null);
      setEditingTextId(null);
    }
    return id;
  }

  function openStampModal(
    x: number,
    y: number,
    kind: "SIGNATURE" | "PARAPHE" | "IMAGE"
  ) {
    setPendingPos({ x, y });
    setPendingTool(kind);
    setError(null);
    setSigModal(true);
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!file) return;
    if (movedDuringDrag.current) {
      movedDuringDrag.current = false;
      return;
    }
    if (dragRef.current || resizeRef.current) return;
    if (editingTextId) {
      // Valider le texte en cours en cliquant ailleurs
      setEditingTextId(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;

    if (tool === "SIGNATURE") {
      if (useKeptOnClick && keptSignature) {
        placeAnnotation(x, y, keptSignature, "SIGNATURE");
        return;
      }
      openStampModal(x, y, "SIGNATURE");
      return;
    }
    if (tool === "PARAPHE") {
      openStampModal(x, y, "PARAPHE");
      return;
    }
    if (tool === "IMAGE") {
      if (useKeptOnClick && keptImageStamp) {
        placeAnnotation(x, y, keptImageStamp, "IMAGE");
        return;
      }
      openStampModal(x, y, "IMAGE");
      return;
    }
    if (tool === "DATE") {
      placeAnnotation(x, y, new Date().toLocaleDateString("fr-FR"), "DATE");
      return;
    }
    if (tool === "COCHE") {
      placeAnnotation(x, y, "✓", "COCHE");
      return;
    }
    if (tool === "TEXTE") {
      // Écrire directement sur le document
      placeAnnotation(x, y, "", "TEXTE", { editText: true });
      setError(null);
    }
  }

  function onAnnotationPointerDown(e: React.PointerEvent, a: Annotation) {
    e.stopPropagation();
    e.preventDefault();
    if (resizeRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    movedDuringDrag.current = false;
    dragRef.current = {
      id: a.id,
      offsetX: (e.clientX - rect.left) / rect.width - a.posX,
      offsetY: (e.clientY - rect.top) / rect.height - a.posY,
    };
    setSelectedId(a.id);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onResizePointerDown(
    e: React.PointerEvent,
    a: Annotation,
    corner: "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w"
  ) {
    e.stopPropagation();
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    movedDuringDrag.current = false;
    dragRef.current = null;
    resizeRef.current = {
      id: a.id,
      corner,
      startX: (e.clientX - rect.left) / rect.width,
      startY: (e.clientY - rect.top) / rect.height,
      orig: { ...a },
    };
    setSelectedId(a.id);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onCanvasPointerMove(e: React.PointerEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const my = (e.clientY - rect.top) / rect.height;

    const resize = resizeRef.current;
    if (resize) {
      movedDuringDrag.current = true;
      const { orig, corner, startX, startY } = resize;
      const dx = mx - startX;
      const dy = my - startY;
      let posX = orig.posX;
      let posY = orig.posY;
      let largeur = orig.largeur;
      let hauteur = orig.hauteur;

      if (corner.includes("e")) {
        largeur = Math.max(MIN_W, orig.largeur + dx);
      }
      if (corner.includes("s")) {
        hauteur = Math.max(MIN_H, orig.hauteur + dy);
      }
      if (corner.includes("w")) {
        largeur = Math.max(MIN_W, orig.largeur - dx);
        posX = orig.posX + (orig.largeur - largeur);
      }
      if (corner.includes("n")) {
        hauteur = Math.max(MIN_H, orig.hauteur - dy);
        posY = orig.posY + (orig.hauteur - hauteur);
      }

      // Garder dans la page
      if (posX < 0) {
        largeur += posX;
        posX = 0;
      }
      if (posY < 0) {
        hauteur += posY;
        posY = 0;
      }
      if (posX + largeur > 1) largeur = 1 - posX;
      if (posY + hauteur > 1) hauteur = 1 - posY;
      largeur = Math.max(MIN_W, largeur);
      hauteur = Math.max(MIN_H, hauteur);

      setAnnotations((rows) =>
        rows.map((r) =>
          r.id === resize.id ? { ...r, posX, posY, largeur, hauteur } : r
        )
      );
      return;
    }

    const drag = dragRef.current;
    if (!drag) return;
    movedDuringDrag.current = true;
    const a = annotations.find((r) => r.id === drag.id);
    if (!a) return;
    const x = mx - drag.offsetX;
    const y = my - drag.offsetY;
    setAnnotations((rows) =>
      rows.map((r) =>
        r.id === drag.id
          ? {
              ...r,
              posX: Math.min(Math.max(x, 0), 1 - r.largeur),
              posY: Math.min(Math.max(y, 0), 1 - r.hauteur),
            }
          : r
      )
    );
  }

  function onCanvasPointerUp() {
    if (
      (dragRef.current || resizeRef.current) &&
      movedDuringDrag.current
    ) {
      setAnnotations((current) => {
        pushHistory(current);
        return current;
      });
    }
    dragRef.current = null;
    resizeRef.current = null;
    window.setTimeout(() => {
      if (!dragRef.current && !resizeRef.current) {
        movedDuringDrag.current = false;
      }
    }, 0);
  }

  async function applyStamp(imageDataUrl: string) {
    if (!pendingPos) return;
    const type: Tool =
      pendingTool === "PARAPHE"
        ? "PARAPHE"
        : pendingTool === "IMAGE"
          ? "IMAGE"
          : "SIGNATURE";

    let stamp = imageDataUrl;
    if (type === "SIGNATURE" || type === "PARAPHE") {
      const isInitials = type === "PARAPHE";
      stamp = await composeSignatureReturnStamp({
        signatureImage: imageDataUrl,
        label: isInitials
          ? initialsFromName(user?.nom ?? "MN")
          : user?.nom?.trim() || "Signataire",
        variant: isInitials ? "initiales" : "signature",
      });
      writeKept(KEPT_SIGNATURE_KEY, stamp);
      setKeptSignature(stamp);
      setUseKeptOnClick(true);
    }
    if (type === "IMAGE") {
      writeKept(KEPT_IMAGE_KEY, imageDataUrl);
      setKeptImageStamp(imageDataUrl);
      setUseKeptOnClick(true);
    }
    placeAnnotation(pendingPos.x, pendingPos.y, stamp, type);
    setPendingPos(null);
    setError(null);
  }

  function updateTextAnnotation(id: string, value: string) {
    setAnnotations((rows) =>
      rows.map((r) => (r.id === id ? { ...r, valeur: value } : r))
    );
  }

  function commitTextEdit(id: string) {
    const row = annotations.find((a) => a.id === id);
    setEditingTextId(null);
    if (row && !row.valeur.trim()) {
      commitAnnotations((rows) => rows.filter((r) => r.id !== id));
      if (selectedId === id) setSelectedId(null);
      return;
    }
    // Enregistrer dans l'historique
    setAnnotations((current) => {
      pushHistory(current);
      return current;
    });
  }

  function deleteSelected() {
    if (!selectedId) return;
    commitAnnotations((rows) => rows.filter((r) => r.id !== selectedId));
    setSelectedId(null);
  }

  function handleDownload() {
    if (!previewUrl || !file) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = file.name;
    a.click();
  }

  function handlePrint() {
    if (!previewUrl) return;
    const w = window.open(previewUrl, "_blank");
    if (w) {
      w.addEventListener("load", () => {
        w.focus();
        w.print();
      });
    }
  }

  async function handleSave() {
    setError(null);
    if (!file) {
      setError("Choisissez un document à éditer.");
      return;
    }
    if (annotations.length === 0) {
      setError("Ajoutez au moins une annotation (signature, initiales, image…).");
      return;
    }
    setLoading(true);
    try {
      const fileBase64 = await fileToBase64(file);
      const sig =
        annotations.find(
          (a) => a.type === "SIGNATURE" && a.valeur.startsWith("data:image/")
        )?.valeur ?? null;
      const result = await saveSelfSignedDocument({
        titre: titre.trim() || file.name,
        fileBase64,
        fileName: file.name,
        fileMime: file.type || "application/octet-stream",
        annotations: annotations.map(
          ({ type, valeur, posX, posY, largeur, hauteur }) => ({
            type,
            valeur,
            posX,
            posY,
            largeur,
            hauteur,
          })
        ),
        signatureImage: sig,
      });
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/signatures/${result.id}`);
      router.refresh();
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    }
  }

  function isVisual(a: Annotation) {
    return a.valeur.startsWith("data:image/");
  }

  const displayName = file?.name ?? "Document";
  const shortName =
    displayName.length > 28 ? `${displayName.slice(0, 26)}…` : displayName;

  const pageStyle = {
    width: pageSize.w,
    height: pageSize.h,
    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
    transformOrigin: "center center",
  } as const;

  const pdfSrc = previewUrl
    ? `${previewUrl}#toolbar=0&navpanes=0&scrollbar=1&view=Fit&zoom=page-fit`
    : null;

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col">
      <PageHeader
        title="Remplir et signer"
        description="Affichez toute la page, zoomez, placez et déplacez signature / initiales / image"
      />

      {error && (
        <div className="mb-3">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {!file && (
        <Card className="flex flex-1 flex-col items-center justify-center border-dashed p-10 text-center">
          <Upload className="h-10 w-10 text-[var(--c-blue-600)]" />
          <p className="mt-3 font-medium">Importez un PDF ou une image</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            La barre d&apos;outils permet zoom, page entière, rotation, annuler /
            rétablir.
          </p>
          <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-md bg-[var(--c-blue-700)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--c-blue-800)]">
            <Upload className="h-4 w-4" />
            Choisir un fichier
            <input
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </Card>
      )}

      {file && (
        <div className="grid flex-1 gap-4 lg:grid-cols-[220px_1fr]">
          <Card className="h-fit space-y-4 p-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Outils
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {tools.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTool(t.id)}
                      className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-xs transition ${
                        tool === t.id
                          ? "border-[var(--c-blue-600)] bg-[var(--c-blue-50)] text-[var(--c-blue-900)]"
                          : "border-[var(--border)] hover:border-[var(--c-blue-300)]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {tool === "TEXTE" && (
              <p className="text-xs text-slate-500">
                Cliquez sur le document et tapez directement votre texte.
              </p>
            )}

            {(keptSignature || savedSignature) && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--c-stone-50)] p-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Ma signature
                </p>
                <button
                  type="button"
                  className="mt-2 block w-full rounded border border-dashed border-slate-300 bg-white p-2 hover:border-[var(--c-blue-400)]"
                  onClick={() => {
                    setTool("SIGNATURE");
                    setUseKeptOnClick(true);
                    if (keptSignature || savedSignature) {
                      setKeptSignature(keptSignature || savedSignature);
                    }
                  }}
                  title="Utiliser cette signature au prochain clic"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={(keptSignature || savedSignature)!}
                    alt="Signature enregistrée"
                    className="mx-auto max-h-14 bg-transparent object-contain"
                  />
                </button>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1 text-xs"
                    onClick={() => {
                      setTool("SIGNATURE");
                      setUseKeptOnClick(false);
                      if (file) openStampModal(0.5, 0.55, "SIGNATURE");
                    }}
                  >
                    Modifier
                  </Button>
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-[var(--border)] px-2 py-1.5 text-xs hover:bg-white">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={useKeptOnClick && tool === "SIGNATURE"}
                      onChange={(e) => {
                        setUseKeptOnClick(e.target.checked);
                        if (e.target.checked) setTool("SIGNATURE");
                      }}
                    />
                    Auto
                  </label>
                </div>
                <p className="mt-1.5 text-[10px] text-slate-500">
                  Auto : clic sur le doc = place cette signature.
                </p>
              </div>
            )}

            {keptImageStamp && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--c-stone-50)] p-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Image conservée
                </p>
                <button
                  type="button"
                  className="mt-2 block w-full rounded border bg-white p-2"
                  onClick={() => {
                    setTool("IMAGE");
                    setUseKeptOnClick(true);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={keptImageStamp}
                    alt="Image"
                    className="mx-auto max-h-12 object-contain"
                  />
                </button>
              </div>
            )}

            {!keptSignature && !savedSignature && (
              <Button
                type="button"
                variant="secondary"
                className="w-full text-xs"
                onClick={() => {
                  setTool("SIGNATURE");
                  setUseKeptOnClick(false);
                  if (file) openStampModal(0.5, 0.55, "SIGNATURE");
                }}
              >
                Créer ma signature
              </Button>
            )}

            <Input
              label="Nom du document"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
            />

            <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-[var(--border-strong)] bg-white px-3 py-2 text-sm hover:border-[var(--c-blue-400)]">
              <Upload className="h-4 w-4" />
              Changer le fichier
              <input
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <div className="border-t border-[var(--border)] pt-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Annotations ({annotations.length})
              </p>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs">
                {annotations.map((a) => (
                  <li
                    key={a.id}
                    className={`flex items-center justify-between gap-2 rounded px-2 py-1.5 ${
                      selectedId === a.id
                        ? "bg-[var(--c-blue-50)]"
                        : "bg-[var(--c-stone-50)]"
                    }`}
                  >
                    <button
                      type="button"
                      className="truncate text-left"
                      onClick={() => setSelectedId(a.id)}
                    >
                      {a.type}
                      {!isVisual(a) ? ` · ${a.valeur}` : " · image"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        commitAnnotations((rows) =>
                          rows.filter((r) => r.id !== a.id)
                        );
                        if (selectedId === a.id) setSelectedId(null);
                      }}
                      className="text-slate-400 hover:text-red-600"
                      aria-label="Supprimer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <Button className="w-full" disabled={loading} onClick={handleSave}>
              {loading ? "Enregistrement…" : "Enregistrer une copie certifiée"}
            </Button>
          </Card>

          <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-xl border border-slate-700 bg-[#2d2d2d] shadow-lg">
            {/* Adobe-style dark toolbar */}
            <div className="flex h-11 shrink-0 items-center gap-1 border-b border-black/40 bg-[#323232] px-2 text-white">
              <ToolbarBtn label="Menu">
                <Menu className="h-4 w-4" />
              </ToolbarBtn>
              <span
                className="mr-2 max-w-[160px] truncate text-xs text-white/85 sm:max-w-[220px]"
                title={displayName}
              >
                {shortName}
              </span>

              <div className="mx-1 hidden h-5 w-px bg-white/20 sm:block" />

              <div className="flex items-center gap-1 text-xs text-white/90">
                <span className="rounded bg-black/35 px-1.5 py-0.5 font-medium tabular-nums">
                  1
                </span>
                <span className="text-white/55">/</span>
                <span className="tabular-nums text-white/80">1</span>
              </div>

              <div className="mx-1 hidden h-5 w-px bg-white/20 sm:block" />

              <ToolbarBtn
                label="Zoom arrière"
                onClick={() =>
                  setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))
                }
              >
                <Minus className="h-4 w-4" />
              </ToolbarBtn>
              <span className="min-w-[3.25rem] rounded bg-black/35 px-1.5 py-0.5 text-center text-xs font-medium tabular-nums">
                {zoom}%
              </span>
              <ToolbarBtn
                label="Zoom avant"
                onClick={() =>
                  setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))
                }
              >
                <Plus className="h-4 w-4" />
              </ToolbarBtn>

              <ToolbarBtn label="Page entière" onClick={fitPage}>
                <Maximize2 className="h-4 w-4" />
              </ToolbarBtn>
              <ToolbarBtn label="Largeur de page" onClick={fitWidth}>
                <span className="text-[10px] font-semibold leading-none">⇔</span>
              </ToolbarBtn>
              <ToolbarBtn
                label="Portrait"
                active={orientation === "portrait" && rotation % 180 === 0}
                onClick={() => applyOrientation("portrait")}
              >
                <RectangleVertical className="h-4 w-4" />
              </ToolbarBtn>
              <ToolbarBtn
                label="Paysage"
                active={orientation === "landscape" && rotation % 180 === 0}
                onClick={() => applyOrientation("landscape")}
              >
                <RectangleHorizontal className="h-4 w-4" />
              </ToolbarBtn>
              <ToolbarBtn
                label="Tourner"
                onClick={() => setRotation((r) => (r + 90) % 360)}
              >
                <RotateCw className="h-4 w-4" />
              </ToolbarBtn>

              <span className="ml-1 hidden rounded bg-black/35 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/75 sm:inline">
                {orientation === "portrait" ? "Portrait" : "Paysage"}
              </span>
              <div className="mx-1 hidden h-5 w-px bg-white/20 md:block" />

              <ToolbarBtn
                label="Signature / paraphe"
                active={tool === "SIGNATURE" || tool === "PARAPHE"}
                onClick={() => setTool("SIGNATURE")}
              >
                <PenLine className="h-4 w-4" />
              </ToolbarBtn>
              <ToolbarBtn
                label="Annuler"
                disabled={!canUndo}
                onClick={undo}
              >
                <Undo2 className="h-4 w-4" />
              </ToolbarBtn>
              <ToolbarBtn
                label="Rétablir"
                disabled={!canRedo}
                onClick={redo}
              >
                <Redo2 className="h-4 w-4" />
              </ToolbarBtn>

              <div className="ml-auto flex items-center gap-0.5">
                <div className="relative">
                  <ToolbarBtn
                    label="Ajouter un champ"
                    active={toolsMenuOpen}
                    onClick={() => setToolsMenuOpen((v) => !v)}
                  >
                    <Plus className="h-4 w-4" />
                  </ToolbarBtn>
                  {toolsMenuOpen && (
                    <div className="absolute right-0 top-9 z-30 w-44 overflow-hidden rounded-lg border border-slate-600 bg-[#3a3a3a] py-1 shadow-xl">
                      {tools.map((t) => {
                        const Icon = t.icon;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white hover:bg-white/10"
                            onClick={() => {
                              setTool(t.id);
                              setToolsMenuOpen(false);
                            }}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <ToolbarBtn label="Télécharger" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                </ToolbarBtn>
                <ToolbarBtn label="Imprimer" onClick={handlePrint}>
                  <Printer className="h-4 w-4" />
                </ToolbarBtn>
                <ToolbarBtn
                  label="Supprimer la sélection"
                  disabled={!selectedId}
                  onClick={deleteSelected}
                >
                  <MoreVertical className="h-4 w-4" />
                </ToolbarBtn>
              </div>
            </div>

            {/* Document viewport — whole page visible via fit / scroll */}
            <div
              ref={viewportRef}
              className="relative flex-1 overflow-auto bg-[#525659]"
              onClick={() => setToolsMenuOpen(false)}
            >
              <div className="flex min-h-full min-w-full items-center justify-center p-6">
                <div
                  ref={pageRef}
                  className="relative shrink-0"
                  style={{
                    width: pageStyle.width * (zoom / 100),
                    height: pageStyle.height * (zoom / 100),
                  }}
                >
                  <div
                    ref={canvasRef}
                    className="absolute left-1/2 top-1/2 touch-none cursor-crosshair overflow-hidden bg-white shadow-2xl"
                    style={{
                      width: pageSize.w,
                      height: pageSize.h,
                      marginLeft: -pageSize.w / 2,
                      marginTop: -pageSize.h / 2,
                      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    }}
                    onClick={handleCanvasClick}
                    onPointerMove={onCanvasPointerMove}
                    onPointerUp={onCanvasPointerUp}
                    onPointerLeave={onCanvasPointerUp}
                  >
                    {isImage && previewUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl}
                        alt="Document"
                        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                        draggable={false}
                      />
                    )}

                    {isPdf && pdfSrc && (
                      <iframe
                        title="PDF"
                        src={pdfSrc}
                        className="pointer-events-none absolute inset-0 h-full w-full border-0 bg-white"
                      />
                    )}

                    {!isImage && !isPdf && (
                      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                        <p className="font-medium text-slate-800">{file.name}</p>
                        <p className="mt-2 max-w-md text-sm text-slate-500">
                          Aperçu limité pour ce format. Placez les annotations
                          ici.
                        </p>
                      </div>
                    )}

                    {annotations.map((a) => {
                      const selected = selectedId === a.id;
                      const handles: {
                        id: "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";
                        className: string;
                        cursor: string;
                      }[] = [
                        {
                          id: "nw",
                          className: "-left-1.5 -top-1.5",
                          cursor: "nwse-resize",
                        },
                        {
                          id: "ne",
                          className: "-right-1.5 -top-1.5",
                          cursor: "nesw-resize",
                        },
                        {
                          id: "sw",
                          className: "-left-1.5 -bottom-1.5",
                          cursor: "nesw-resize",
                        },
                        {
                          id: "se",
                          className: "-right-1.5 -bottom-1.5",
                          cursor: "nwse-resize",
                        },
                        {
                          id: "n",
                          className: "left-1/2 -top-1.5 -translate-x-1/2",
                          cursor: "ns-resize",
                        },
                        {
                          id: "s",
                          className: "left-1/2 -bottom-1.5 -translate-x-1/2",
                          cursor: "ns-resize",
                        },
                        {
                          id: "e",
                          className: "-right-1.5 top-1/2 -translate-y-1/2",
                          cursor: "ew-resize",
                        },
                        {
                          id: "w",
                          className: "-left-1.5 top-1/2 -translate-y-1/2",
                          cursor: "ew-resize",
                        },
                      ];
                      return (
                        <div
                          key={a.id}
                          className={`group absolute flex cursor-grab items-center justify-center overflow-visible bg-transparent active:cursor-grabbing ${
                            selected ? "z-10" : "z-[1]"
                          }`}
                          style={{
                            left: `${a.posX * 100}%`,
                            top: `${a.posY * 100}%`,
                            width: `${a.largeur * 100}%`,
                            height: `${a.hauteur * 100}%`,
                          }}
                          onPointerDown={(e) => onAnnotationPointerDown(e, a)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(a.id);
                          }}
                        >
                          <span
                            className={`pointer-events-none absolute inset-0 rounded-sm border border-dashed ${
                              selected
                                ? "border-sky-500"
                                : "border-transparent group-hover:border-sky-400/60"
                            }`}
                          />
                          {isVisual(a) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={a.valeur}
                              alt={a.type}
                              className="pointer-events-none h-full w-full bg-transparent object-contain"
                              draggable={false}
                            />
                          ) : editingTextId === a.id && a.type === "TEXTE" ? (
                            <textarea
                              ref={textInputRef}
                              value={a.valeur}
                              placeholder="Écrire…"
                              className="h-full w-full resize-none border-0 bg-transparent px-1 py-0.5 font-semibold text-slate-900 outline-none [text-shadow:0_0_3px_#fff]"
                              style={{
                                fontSize: `clamp(10px, ${a.hauteur * pageSize.h * 0.45}px, 48px)`,
                              }}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                updateTextAnnotation(a.id, e.target.value)
                              }
                              onBlur={() => commitTextEdit(a.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  commitTextEdit(a.id);
                                }
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  commitTextEdit(a.id);
                                }
                              }}
                            />
                          ) : (
                            <span
                              className="max-h-full max-w-full overflow-hidden px-1 font-semibold leading-tight text-slate-900 [text-shadow:0_0_3px_#fff,0_0_6px_#fff]"
                              style={{
                                fontSize: `clamp(10px, ${a.hauteur * pageSize.h * 0.55}px, 64px)`,
                              }}
                              onDoubleClick={(e) => {
                                if (a.type !== "TEXTE" && a.type !== "DATE")
                                  return;
                                e.stopPropagation();
                                setEditingTextId(a.id);
                                setSelectedId(a.id);
                              }}
                            >
                              {a.valeur || (
                                <span className="text-slate-400">Écrire…</span>
                              )}
                            </span>
                          )}
                          <button
                            type="button"
                            className={`absolute -right-2 -top-2 z-20 rounded-full bg-slate-800/80 p-0.5 text-white hover:bg-red-600 ${
                              selected
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100"
                            }`}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              commitAnnotations((rows) =>
                                rows.filter((r) => r.id !== a.id)
                              );
                              if (selectedId === a.id) setSelectedId(null);
                            }}
                            aria-label="Supprimer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          {/* Poignées pour étirer / agrandir */}
                          {handles.map((h) => (
                              <span
                                key={h.id}
                                role="presentation"
                                title="Étirer"
                                className={`absolute z-20 h-3 w-3 rounded-sm border-2 border-sky-600 bg-white shadow ${h.className} ${
                                  selected
                                    ? "opacity-100"
                                    : "opacity-0 group-hover:opacity-100"
                                }`}
                                style={{ cursor: h.cursor }}
                                onPointerDown={(e) =>
                                  onResizePointerDown(e, a, h.id)
                                }
                              />
                            ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <SignatureCaptureModal
        open={sigModal}
        onClose={() => {
          setSigModal(false);
          setPendingPos(null);
        }}
        onApply={applyStamp}
        defaultName={user?.nom ?? ""}
        variant={
          pendingTool === "PARAPHE"
            ? "initiales"
            : pendingTool === "IMAGE"
              ? "image"
              : "signature"
        }
        savedSignature={keptSignature || savedSignature}
        allowSave
        initialImage={
          pendingTool === "IMAGE"
            ? keptImageStamp
            : pendingTool === "SIGNATURE"
              ? keptSignature || savedSignature
              : null
        }
      />
    </div>
  );
}
